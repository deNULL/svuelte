const compiler = require('vue-template-compiler');
const chalk = require('chalk');
const path = require('path');
const fs = require('fs');

// Funcs

const quoteBindedAttrs = true;
const useShortBinds = true;

function processTemplateExpression(expr) {
  return expr; // for now
}

function processTemplateNode(node, output, depth, indent) {
  switch (node.type) {
    case 1: // Tag
      if (node['for']) {
        output.push(`${indent.repeat(depth)}{#each ${processTemplateExpression(node['for'])} as ${node.alias}${node.iterator1 ? ', ' + node.iterator1 : ''}}\n`);
        depth++;
      }

      if (node['if']) {
        output.push(`${indent.repeat(depth)}{#if ${processTemplateExpression(node['if'])}}\n`);
        depth++;
      } else
      if (node['else']) {
        output.push(`${indent.repeat(depth)}{:else}\n`);
        depth++;
      } else
      if (node['elseif']) {
        output.push(`${indent.repeat(depth)}{:else if ${processTemplateExpression(node['elseif'])}}\n`);
        depth++;
      }

      output.push(`${indent.repeat(depth)}<${node.tag}`);

      let attrs = [];
      let vHtml = null;
      for (let attr in node.attrsMap) {
        if (['v-if', 'v-else', 'v-else-if', 'v-for'].includes(attr)) {
          continue;
        }
        if (attr === 'v-html') {
          vHtml = node.attrsMap[attr];
        } else
        if (attr[0] === ':' || attr.startsWith('v-bind:')) {
          let key = attr.substr(attr[0] === ':' ? 1 : 7);
          if (key === node.attrsMap[attr] && useShortBinds) {
            attrs.push(`{${key}}`);
          } else {
            attrs.push(`${key}=${quoteBindedAttrs ? '"' : ''}{${
              processTemplateExpression(node.attrsMap[attr])
            }}${quoteBindedAttrs ? '"' : ''}`);
          }
        } else
        if (attr[0] === '@' || attr.startsWith('v-on:')) {
          let key = attr.substr(attr[0] === '@' ? 1 : 5);
          attrs.push(`on:${key}=${quoteBindedAttrs ? '"' : ''}{${
              processTemplateExpression(node.attrsMap[attr])
            }}${quoteBindedAttrs ? '"' : ''}`);
        } else {
          attrs.push(`${attr}="${node.attrsMap[attr]}"`);
        }
      }
      if (attrs.length) {
        output.push(` ${attrs.join(`\n${indent.repeat(depth)}${' '.repeat(node.tag.length + 2)}`)}`);
      }

      if (!node.children.length && vHtml !== null) {
        output.push('/>\n');
      } else {
        output.push('>\n');
        if (vHtml !== null) {
          output.push(`${indent.repeat(depth + 1)}{@html ${processTemplateExpression(vHtml)}}\n`);
          if (node.children.length) {
            console.log(chalk`{yellow Warning: found a node with children and} {green v-html} {yellow directive. Its children will be ignored.}`);
          }
        } else {
          for (let child of node.children) {
            processTemplateNode(child, output, depth + 1, indent);
          }
        }
        output.push(`${indent.repeat(depth)}</${node.tag}>\n`);
      }

      if (node.ifConditions && node.ifConditions.length > 1) {
        depth--;
        for (let i = 1; i < node.ifConditions.length; i++) {
          processTemplateNode(node.ifConditions[i].block, output, depth, indent);
        }
        depth++;
      }
      if (node['if']) {
        depth--;
        output.push(`${indent.repeat(depth)}{/if}\n`);
      }

      if (node['for']) {
        depth--;
        output.push(`${indent.repeat(depth)}{/each}\n`);
      }
      break;
    case 2: // Dynamic text
      output.push(indent.repeat(depth), node.tokens.map(token => {
        if (typeof token === 'string') {
          return token;
        } else {
          return `{${token['@binding']}}`;
        }
      }).join('').trim(), '\n');
      break;
    case 3: // Static text
      const text = node.text.trim();
      if (text.length) {
        output.push(text);
      }
      break;
    default:
      console.log(chalk`{red Unknown node in template AST tree:}\n`, node);
      process.exit();
  }
}

// Start

if (process.argv.length < 3) {
  console.log(chalk`Please provide a file path to a SFC Vue component you want to convert.

{yellow Example:}
node ${process.argv[1]} Button.vue`);
  process.exit();
}

const inputPath = process.argv[2];
let outputPath = './' + path.basename(inputPath, '.vue') + '.svelte';
let inputContent;

try {  
  var data = fs.readFileSync(inputPath, 'utf8');
  inputContent = data.toString();
} catch(e) {
  console.log(chalk`{red Error while reading file} {yellow ${inputPath}}{red :}\n`, e.stack);
  process.exit();
}

const sfc = compiler.parseComponent(inputContent);
let output = [];

if (sfc.template) {
  const template = compiler.compile(sfc.template.content);

  if (template.errors.length) {
    console.log(chalk`{red Error(s) while parsing template:}\n`);
    for (let error of template.errors) {
      console.log(error);
    }
    process.exit();
  }

  //console.log(template.ast);
  processTemplateNode(template.ast, output, 0, ' '.repeat(2));
}

fs.writeFileSync(outputPath, output.join(''), 'utf8');