/* jslint esversion: 6 */

let fs = require("fs");
let http = require("http");
let https = require("https");
let path = require("path");
let url = require("url");

let htmlparser = require("htmlparser2");

const SPEC_URL = "https://raw.githubusercontent.com/tc39/ecma262/master/spec.html";
const SPEC_CACHE = "build/spec/";

let fetchContent = function(options) {
    if (typeof options !== "object") {
        throw Error("No options given");
    }
    if (typeof options.url !== "string") {
        throw Error("No url set");
    } else {
        options.url = url.parse(options.url);
    }
    if (typeof options.cache === "string" && typeof options.data !== "string") {
        options.data = options.cache + ".data";
    }
    return new Promise(function(done, err) {
        if (typeof options.cache === "string") {
            try {
                let stats = fs.statSync(options.data);
                if (stats.isFile()) {
                    options.status = JSON.parse(
                        fs.readFileSync(options.data, {encoding: "utf8"})
                    );
                }
                if (options.status.etag) {
                    options.url.headers = {"If-None-Match": options.status.etag};
                }
            } catch (e) {
                // Ignore
            }
        }
        let content = "";
        let req = (options.url.protocol.match("^https") ? https : http).get(options.url, (res) => {
            res.on("data", (chunk) => {
                content += chunk;
            });
            res.on("end", () => {
                if (res.statusCode === 304) {
                    content = fs.readFileSync(options.cache, {encoding: "utf8"});
                } else if (typeof options.cache === "string" && res.headers.etag) {
                    let cacheDir = path.dirname(options.cache);
                    let dataDir = path.dirname(options.data);
                    let tmp;
                    try { if (!fs.statSync(cacheDir).isDirectory()) throw Error(); }
                        catch (e) { fs.mkdirSync(cacheDir); }
                    try { if (!fs.statSync(dataDir).isDirectory()) throw Error(); }
                        catch (e) { fs.mkdirSync(dataDir); }
                    fs.writeFileSync(options.cache, content);
                    fs.writeFileSync(options.data, JSON.stringify({
                        etag: res.headers.etag
                    }));
                }
                done(content);
            });
            res.on("error", (e) => {
                err(e);
            });
        });
    });
};

let fetchSpec = function() {
    return fetchContent({
        url: SPEC_URL,
        cache: SPEC_CACHE + "ecma262.html"
    });
};

let fetchGrammar = function(html) {
    let annexA = html.find(function(obj) {
        return obj.type === "tag" &&
            obj.name === "emu-annex" &&
            obj.attribs.id === "sec-grammar-summary";
    });
    let grammarRules = htmlparser.DomUtils.find(function(obj) {
        return obj.type === "tag" && obj.name === "emu-grammar";
    }, html, true);

    let grammerParser = (node) => {
        let definitions = [];

        for (let i in node.children) {
            let definition = node.children[i];
            switch(definition.type) {
                case "comment":
                break;
                case "text":
                    if (definition.data.match(/\n\s*/)) {
                        continue;
                    } else {
                        console.log("text: '", definition.data, "'");
                    }
                    break;
                case "tag":
                    if (definition.name === "emu-prodref") {
                        definitions.push({
                            definition: definition.attribs.name,
                            type: node.attribs.id,
                            notes: []
                        });
                    } else if (definition.name === "p") {
                        if (definition.children.length === 1 &&
                            definition.children[0].type === "text" &&
                            definition.children[0].data === "&nbsp;"
                        )
                            continue;
                        definitions[definitions.length - 1].notes.push(definition);
                    } else if (definition.name === "h1") {
                        continue;
                    } else {
                        console.log("Unknown tag " + definition.name);
                    }
                    break;
                default:
                    console.log(Error.stack, definition);
                    throw Error("Unknown node");
            }
        }

        return definitions;
    };

    let definitions = [];
    for (let i in annexA.children) {
        let node = annexA.children[i];
        switch (node.type) {
            case "text":
            case "comment":
                break;
            case "tag":
                if (node.name !== "emu-annex") {
                    continue;
                }
                definitions = definitions.concat(grammerParser(node));
                break;
            default:
                throw Error("Unknown node");
        }
    }

    let f = (def) => (obj) => {
        return obj.children[0].data.match("\\n\\s*" + def + "(?:\\[[a-zA-Z,?+~ ]+\\])?\\s*:");
    };
    let r = (def) => (obj) => {
        return obj.children[0].data.match(def + "(?:\\[[a-zA-Z,?+~ ]+\\])?\\s*:\\n?(?:[^\\n]+\\n)*\\n?");
    };
    let p = (def, arr) => {
        results = [];
        for (let i = 0; i < arr.length; i++) {
            for (let j = 0; j < arr[i].length; j++) {
                if (typeof arr[i][j] === "string") {
                    let rule = arr[i][j].replace(/ {2,}/g, "").trim();
                    if (/^[^:]*:+(\n`[^`\n]*`){2,}\n*$/.test(rule)) {
                        rule = rule.replace(/`\n/g, "` ").replace(/:\n/, ": one of\n");
                    } else if (/^[^:]*:+(\n\s*&lt;[^&\n]*&gt;){2,}\n*$/.test(rule)) {
                        rule = rule.replace(/&gt;\n/g, "&gt; ").replace(/:\n/, ": one of\n");
                    }
                    if (results.indexOf(rule) !== -1) {
                        continue;
                    }
                    results.push(rule);
                }
            }
        }

        return results;
    };
    for (let i in definitions) {
        definitions[i].rules = grammarRules.filter(f(definitions[i].definition));
        if (definitions[i].rules.length === 0)
            throw Error(definitions[i].definition + " has no results");
        definitions[i].rules = definitions[i].rules.map(r(definitions[i].definition));
        definitions[i].rules = p(definitions[i].definition, definitions[i].rules);
    }

    return definitions;
};

let htmlGen = (grammar) => {
    let content = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>ES 6 Grammar parsing rules</title>
<style>
@media print {
    .no-print {
        display: none !important;
    }
    .multi-col {
        -moz-column-count: 3;
        -moz-column-gap: 5px;
        -webkit-column-count: 3;
        -webkit-column-gap: 5px;
        column-count: 3;
        column-gap: 5px;
        column-fill: balance;
    }
}
@page {
    margin: 6mm;
}
@media screen and (min-width:1200px) {
    .multi-col {
        -moz-column-count: 4;
        -moz-column-gap: 10px;
        -webkit-column-count: 4;
        -webkit-column-gap: 10px;
        column-count: 4;
        column-gap: 10px;
        column-fill: balance;
    }
}
@media screen and (min-width:900px) and (max-width:1199) {
    .multi-col {
        -moz-column-count: 3;
        -moz-column-gap: 10px;
        -webkit-column-count: 3;
        -webkit-column-gap: 10px;
        column-count: 3;
        column-gap: 10px;
        column-fill: balance;
    }
}
@media screen and (min-width:600px) and (max-width:899px) {
    .multi-col {
        -moz-column-count: 2;
        -moz-column-gap: 10px;
        -webkit-column-count: 2;
        -webkit-column-gap: 10px;
        column-count: 2;
        column-gap: 10px;
        column-fill: balance;
    }
}
@media screen and (max-width:300px) {
    .multi-col {
        -moz-column-count: 1;
        -moz-column-gap: 10px;
        -webkit-column-count: 1;
        -webkit-column-gap: 10px;
        column-count: 1;
        column-gap: 10px;
        column-fill: balance;
    }
}
div {
    margin: 0px;
    padding: 0px;
}
p {
    break-after: always;
    margin: 2px 0;
    line-height: 100%;
}
p + p {
    margin-top: 0px;
}
code pre {
    font-size: 75%;
    margin: 2px 0;
    white-space: pre-wrap;
}
code pre::first-line {
    font-weight: bold;
}
input[type='checkbox'] {
    width: 20px;
    height: 20px;
    border-radius: 4px;
}
#selector {
    border: 1px solid #000000;
    border-radius: 5px;
    background: rgba(200,200,200, .5);
}
#selector h2 {
    color: #880088;
}
#grammar {
    line-break: strict;
    word-break: break-all;
}
.definitions b {
    font-size: 80%;
    line-heigth: 90%;
}
.definitions p {
    font-size: 60%;
}
.sec-lexical-grammar b {
    color: #00cc00;
}
.sec-expressions b {
    color: #cc0000;
}
.sec-statements b {
    color: #0000cc;
}
.sec-functions-and-classes b {
    color: #888800;
}
.sec-scripts-and-modules b {
    color: #880088;
}
.sec-number-conversions b {
    color: #008888;
}
.sec-universal-resource-identifier-character-classes b {
    color: #4444cc;
}
.sec-regular-expressions b {
    color: #44cc44;
}
</style>
<link rel="icon" href="es-favicon.ico" type="image/x-icon"/>
</head><body>
<div id="selector" class="multi-col no-print">
<h2>Ecmascript 6 language grammar as of ${new Date().getDate()}/${new Date().getMonth()+1}/${new Date().getFullYear()}</h2>
<input type="checkbox" id="select-lexical-grammar" checked><a href="#">Lexical grammar</a><br>
<input type="checkbox" id="select-expressions" checked><a href="#">Expressions</a><br>
<input type="checkbox" id="select-statements" checked><a href="#">Statements</a><br>
<input type="checkbox" id="select-functions-and-classes" checked><a href="#">Functions and Classes</a><br>
<input type="checkbox" id="select-scripts-and-modules" checked><a href="#">Scripts and Modules</a><br>
<input type="checkbox" id="select-number-conversions" checked><a href="#">Number conversions</a><br>
<input type="checkbox" id="select-universal-resource-identifier-character-classes" checked><a href="#">Universal resource identifier character classes</a><br>
<input type="checkbox" id="select-regular-expressions" checked><a href="#">Regular expressions</a><br>
</div>
<div class="multi-col" id="grammar">`;

    for (let i in grammar) {
        content += '<div class="' + grammar[i].type + ' definitions"><b>' + grammar[i].definition + "</b><br>";
        for (let j in grammar[i].rules) {
            content += "<code><pre>" + grammar[i].rules[j].replace(/\n/g, "<br>&emsp;").replace(/``/g, "` `") + "</pre></code>";
        }
        for (let j in grammar[i].notes) {
            content += "<p>" + htmlparser.DomUtils.getInnerHTML(grammar[i].notes[j]) + "</p>";
        }
        content += "</div>";
    }

    content += "\n</div><script>";
    content += `{let tmp=document.querySelectorAll("#selector input");`;
    content += `for(let i in tmp)if(tmp[i].type==="checkbox"&&tmp[i].id.substr(0,7)==="select-")tmp[i].onchange=function(){`;
    content +=     `let elem="sec-"+this.id.substr(7),visible=this.checked,nodes=document.querySelectorAll("div ." + elem);`;
    content +=     `for(let i=0;i<nodes.length;i++){nodes[i].style.display=visible?null:"none";}`;
    content +=`};`;
    content += `let links=document.querySelectorAll("#selector input + a");`;
    content += `for(let i=0;i<links.length;i++){let name=links[i].previousElementSibling.id;links[i].onclick=function(){`;
    content +=     `console.log(tmp[0].checked);for(let j=0;j<links.length;j++){let prev=links[j].previousElementSibling;prev.checked=prev.id===name;prev.onchange()};console.log("done")`;
    content += `}}}`;
    content += "</script></body></html>";
    return content;
};

fetchSpec().then(function(content) {
    let html = htmlparser.parseDOM(content);
    console.log("Fetched and parsed html");

    try {
        let grammar = fetchGrammar(html);
        let favicon_in  = fs.createReadStream(__dirname + "/../res/es-favicon.ico");
        let favicon_out = fs.createWriteStream(SPEC_CACHE + "es-favicon.ico");
        favicon_in.pipe(favicon_out);
        fs.writeFileSync(SPEC_CACHE + "output.html", htmlGen(grammar));
    } catch (e) {
        console.log(e);
    } finally {
        
    }
}, function(e) {
    console.log(e);
});
