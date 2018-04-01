'use strict';

const fs = require("fs");
const htmlparser = require("htmlparser2");

const scraper = require('../lib/scraper.js');

const RES_DIR = 'res/grammar/';
const RES_STYLE = RES_DIR + 'css/style.css';

const SPEC_URL = "https://raw.githubusercontent.com/tc39/ecma262/master/spec.html";
const SPEC_CACHE = "build/spec/";
const SPEC_CACHE_ECMA_262 = SPEC_CACHE + "ecma262.html";
const SPEC_CACHE_HTML = SPEC_CACHE + "output.html";

const fetchSpec = () => {
    return scraper.fetchContent({
        url: SPEC_URL,
        cache: SPEC_CACHE_ECMA_262
    });
};

const fetchSpecStyle = () => {
    return fs.readFileSync(RES_STYLE, {encoding: "utf8"});
}

const fetchGrammar = (html) => {
    // Prefetch important html/xml nodes
    const annexA = html.find(function(obj) {
        return obj.type === "tag" &&
            obj.name === "emu-annex" &&
            obj.attribs.id === "sec-grammar-summary";
    });
    const grammarRules = htmlparser.DomUtils.find(function(obj) {
        return obj.type === "tag" && obj.name === "emu-grammar";
    }, html, true);

    /**
     * Parses xml nodes containing ecmascript grammar
     *
     * The input refers to the content of an emu-annex node in Annex A.
     * It lists all relevant nodes for ecmascript.
     *
     * Each em-annex node there contains:
     *   - A <h1> header tag, describing the category. Except for prefix, it is
     *     is the same name as as the em-annex id attribute value.
     *   - An empty <emu-prodref> tag, containing a name attribute.
     *     This is a reference to the actual grammar somewhere in the document.
     *
     * Some emu-prodref tags are followed by a <p> tag, adding some extra
     * information about the <emu-prodref> above.
     *
     * Because the raw content is injected for the time being, the content might
     * not be as useful as wanted on the output sheet for the time being.
     *
     * Notes are added to their relevant definition
     *
     * Output format:
     * For each grammar definitions:
     *     An object with properties
     *       - `definition` (definition reference)
     *       - `type`: the emu-prodref id reference (or catagory of the ecmascript grammar)
     *       - `notes`: a list of notitions
     *
     * @param Array node List of html/xml nodes
     *
     * @return Array List of definitions as written above
     */
    const grammerParser = (node) => {
        let definitions = [];

        const notesFormatter = (node) =>
            htmlparser.DomUtils.getInnerHTML(node).replace(
                /<emu-prodref[^>]*name="([a-zA-Z]*)"[^>]*><\/emu-prodref>/g,
                "|$1|"
            );

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
                        definitions[definitions.length - 1].notes.push(notesFormatter(definition));
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

    // Iterate annex a
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

    // Set up helpers
    const defFilter = (def) => (obj) => {
        return obj.children[0].data.match("\\n\\s*" + def + "(?:\\[[a-zA-Z,?+~ ]+\\])?\\s*:");
    };
    const fetchContent = (def) => (obj) => {
        return obj.children[0].data.match(def + "(?:\\[[a-zA-Z,?+~ ]+\\])?\\s*:\\n?(?:[^\\n]+\\n)*\\n?");
    };
    const grammarFormatter = (def, arr) => {
        let results = [];
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

    // Get definitions
    for (let i in definitions) {
        definitions[i].rules = grammarRules.filter(defFilter(definitions[i].definition));
        if (definitions[i].rules.length === 0)
            throw Error(definitions[i].definition + " has no results");
        definitions[i].rules = definitions[i].rules.map(fetchContent(definitions[i].definition));
        definitions[i].rules = grammarFormatter(definitions[i].definition, definitions[i].rules);
    }

    return definitions;
};

const htmlGen = (grammar) => {
    let content = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>ES Grammar parsing rules</title>
<style>
${fetchSpecStyle()}
</style>
<link rel="icon" href="es-favicon.ico" type="image/x-icon"/>
</head><body>
<div id="selector" class="multi-col no-print">
<h2>Ecmascript language grammar as of ${new Date().getDate()}/${new Date().getMonth()+1}/${new Date().getFullYear()}</h2>
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
            content += "<code><pre>" + grammar[i].rules[j].replace(/\n/g, "<br>&emsp;").replace(/``/g, "` `").replace(/[a-zA-Z]+(?:\[([?+~][a-zA-Z]+(, )?)+\])?\?/g, "<i>$&</i>") + "</pre></code>";
        }
        for (let j in grammar[i].notes) {
            content += "<p>" + grammar[i].notes[j] + "</p>";
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
    content +=     `for(let j=0;j<links.length;j++){let prev=links[j].previousElementSibling;prev.checked=prev.id===name;prev.onchange()}`;
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
        fs.writeFileSync(SPEC_CACHE_HTML, htmlGen(grammar));
    } catch (e) {
        console.log(e);
    } finally {
        
    }
}, function(e) {
    console.log(e);
});
