/**
 * Rehype Cursor Plugin - 智能光标插件
 * 
 * 在 Markdown 渲染的最后一个文本节点添加光标，避免在代码块中显示
 * 
 * 工作原理：
 * 1. 递归遍历 AST 树，找到最后一个非代码块的文本节点
 * 2. 在该节点末尾添加光标字符
 * 3. 遇到 pre 或 code 标签时跳过其所有子节点
 * 
 * @module markdown/rehype-cursor
 */

import type { Root, Element, Text, Node, Parent, RootContent } from 'hast'

interface PluginOptions {
  /** 光标字符，默认为 ▍ */
  cursorChar?: string
}

/**
 * Rehype 插件：智能添加光标
 * 
 * @param options - 插件配置选项
 * @returns Rehype 转换函数
 */
export function rehypeCursor(options: PluginOptions = {}) {
  const { cursorChar = '▍' } = options
  
  return (tree: Root): void => {
    const state: { lastTextNode: Text | null } = { lastTextNode: null }
    
    /**
     * 递归遍历节点树
     * 在代码块内部时跳过遍历
     */
    const traverse = (node: Node, inCodeBlock = false): void => {
      // 检查当前节点是否为代码块
      let isCodeBlock = false
      if (node.type === 'element') {
        const element = node as Element
        isCodeBlock = element.tagName === 'pre' || element.tagName === 'code'
      }
      
      // 如果在代码块中，跳过文本节点的处理
      const currentInCodeBlock = inCodeBlock || isCodeBlock
      
      // 处理文本节点（仅在非代码块中）
      if (node.type === 'text' && !currentInCodeBlock) {
        const textNode = node as Text
        if (textNode.value && typeof textNode.value === 'string' && textNode.value.trim()) {
          state.lastTextNode = textNode
        }
      }
      
      // 递归处理子节点
      if ('children' in node && Array.isArray((node as Parent).children)) {
        for (const child of (node as Parent).children) {
          traverse(child, currentInCodeBlock)
        }
      }
    }
    
    // 开始遍历
    traverse(tree)
    
    // 创建光标元素
          const cursorElement: Element = {
            type: 'element',
            tagName: 'span',
            properties: {
              className: ['animate-blink']
            },
            children: [
              {
                type: 'text',
                value: cursorChar
              }
            ]
          }
    
    // 在最后一个文本节点后添加闪烁光标，如果没找到就添加到根节点末尾
    if (state.lastTextNode && state.lastTextNode.value) {
      const parent = findParent(tree, state.lastTextNode)
      if (parent && 'children' in parent) {
        const parentNode = parent as Parent
        const children = parentNode.children as RootContent[]
        const textIndex = children.indexOf(state.lastTextNode as RootContent)
        if (textIndex !== -1) {
          // 在文本节点后插入光标元素
          children.splice(textIndex + 1, 0, cursorElement as RootContent)
        }
      }
    } else {
      // 如果没有找到文本节点（可能全是代码块），则在根节点末尾添加
      tree.children.push(cursorElement as RootContent)
    }
  }
  
  /**
   * 查找节点的父节点
   */
  function findParent(root: Node, target: Node): Node | null {
    function search(node: Node): Node | null {
      if ('children' in node && Array.isArray((node as Parent).children)) {
        const children = (node as Parent).children as RootContent[]
        if (children.some(child => child === target)) {
          return node
        }
        for (const child of children) {
          const result = search(child as Node)
          if (result) return result
        }
      }
      return null
    }
    return search(root)
  }
}
