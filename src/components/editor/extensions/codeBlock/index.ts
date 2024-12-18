import type { CodeBlockOptions } from '@tiptap/extension-code-block'
import type { Node } from '@tiptap/pm/model'
import type { DecorationAttrs } from '@tiptap/pm/view'
import type { HighlighterCore } from 'shiki'
import { findChildren, findChildrenInRange, getChangedRanges } from '@tiptap/core'
import CodeBlock from '@tiptap/extension-code-block'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import { createHighlighterCoreSync } from 'shiki'
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript'
import astro from 'shiki/langs/astro.mjs'
import c from 'shiki/langs/c.mjs'
import cpp from 'shiki/langs/cpp.mjs'
import css from 'shiki/langs/css.mjs'
import graphql from 'shiki/langs/graphql.mjs'
import html from 'shiki/langs/html.mjs'
import http from 'shiki/langs/http.mjs'
import java from 'shiki/langs/java.mjs'
import javascript from 'shiki/langs/javascript.mjs'
import json from 'shiki/langs/json.mjs'
import jsx from 'shiki/langs/jsx.mjs'
import markdown from 'shiki/langs/markdown.mjs'
import php from 'shiki/langs/php.mjs'
import python from 'shiki/langs/python.mjs'
import r from 'shiki/langs/r.mjs'
import regexp from 'shiki/langs/regexp.mjs'
import scss from 'shiki/langs/scss.mjs'
import shellscript from 'shiki/langs/shellscript.mjs'
import sql from 'shiki/langs/sql.mjs'
import svelte from 'shiki/langs/svelte.mjs'
import tsx from 'shiki/langs/tsx.mjs'
import typescript from 'shiki/langs/typescript.mjs'
import vue from 'shiki/langs/vue.mjs'
import wasm from 'shiki/langs/wasm.mjs'
import xml from 'shiki/langs/xml.mjs'
import yaml from 'shiki/langs/yaml.mjs'
import catppuccinLight from 'shiki/themes/catppuccin-latte.mjs'
import catppuccinDark from 'shiki/themes/catppuccin-mocha.mjs'

export interface CodeBlockStorage {
  highlighter: HighlighterCore
}

export const codeBlock = CodeBlock.extend<CodeBlockOptions, CodeBlockStorage>({
  addStorage() {
    const highlighter = createHighlighterCoreSync({
      themes: [
        catppuccinLight,
        catppuccinDark,
      ],
      langs: [
        astro,
        c,
        cpp,
        css,
        graphql,
        html,
        http,
        java,
        javascript,
        json,
        jsx,
        markdown,
        php,
        python,
        r,
        regexp,
        scss,
        shellscript,
        sql,
        svelte,
        tsx,
        typescript,
        vue,
        wasm,
        xml,
        yaml,
      ],
      engine: createJavaScriptRegexEngine(),
    })

    return {
      highlighter,
    }
  },
  addProseMirrorPlugins() {
    const getDecorations = (doc: Node) => {
      const decorations: Decoration[] = []

      findChildren(doc, node => node.type.name === this.name).forEach(({ node, pos }) => {
        const language: string = node.attrs.language ?? 'text'
        const hast = this.storage.highlighter.codeToHast(node.textContent, {
          lang: language,
          themes: {
            light: 'catppuccin-latte',
            dark: 'catppuccin-mocha',
          },
        })

        const preNode = hast.children[0]!
        // @ts-expect-error preNode type
        decorations.push(Decoration.node(pos, pos + node.nodeSize, preNode.properties as DecorationAttrs))

        let from = pos + 1
        // @ts-expect-error preNode type
        const lines = preNode.children[0].children
        for (const line of lines) {
          if ((line as Element).children?.length) {
            let lineFrom = from
            // @ts-expect-error line type
            line.children?.forEach((node) => {
              const nodeLen = node.children[0].value.length
              decorations.push(Decoration.inline(lineFrom, lineFrom + nodeLen, node.properties as DecorationAttrs))
              lineFrom += nodeLen
            })

            from = lineFrom
          }
          else if (line.type === 'text') {
            from += line.value.length
          }
        }
      })

      return DecorationSet.create(doc, decorations)
    }

    return [
      new Plugin({
        key: new PluginKey(this.name),
        state: {
          init(_, { doc }) {
            return getDecorations(doc)
          },
          apply: (tr, value, _, { doc: newDoc }) => {
            if (!tr.docChanged) {
              return value.map(tr.mapping, tr.doc)
            }

            const changedRanges = getChangedRanges(tr)
            let hasChangedCodeBlock = false
            for (const range of changedRanges) {
              hasChangedCodeBlock = !!findChildrenInRange(newDoc, range.newRange, node => node.type.name === this.name).length

              if (hasChangedCodeBlock) {
                return getDecorations(newDoc)
              }
            }

            return value.map(tr.mapping, tr.doc)
          },
        },
        props: {
          decorations(state) {
            return this.getState(state)
          },
        },
      }),
    ]
  },

})