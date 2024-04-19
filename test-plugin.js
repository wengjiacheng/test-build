import posthtml from 'posthtml'
import postcss from 'postcss'
import { chunk } from 'lodash'
class TestPlugin {
  constructor() {
    this.indexHtmlContent = ''
    this.filenames = []
    this.splitFiles = []
  }
  apply(compiler) {
    const { webpack } = compiler
    const { Compilation } = webpack
    const { RawSource } = webpack.sources

    compiler.hooks.thisCompilation.tap('testPlugin', (compilation) => {
      compilation.hooks.processAssets.tapAsync(
        {
          name: 'testPlugin',
          stage: Compilation.PROCESS_ASSETS_STAGE_SUMMARIZE,
        },
        async (assets, cb) => {
          // 找到index.html
          this.indexHtmlContent = compilation.assets['index.html'].source()

          // 找到插入index.html中的css文件
          this.findHtmlCss()

          // 过滤文件，把外部引入的文件排除,检查文件样式是否超出，拆分css
          for (let i = 0; i < this.filenames.length; i++) {
            const filename = this.filenames[i]
            const assetPath = filename.slice(
              compilation.outputOptions.publicPath.length
            )
            const asset = compilation.assets[assetPath]
            if (asset) {
              await this.file(filename, assetPath, asset.source())
            }
          }

          // 拆入拆分的css文件到html
          // 更新index.html引用
          // 生成新文件
          // 删除原文件
          this.splitFiles.forEach((file) => {
            this.deleteSourceHtml(file.filename)
            file.chunks.forEach((chunk) => {
              const filename = compilation.outputOptions.publicPath + chunk.name
              this.addLinkTag(filename)
              // 生成新文件
              compilation.emitAsset(chunk.name, new RawSource(chunk.css))
            })
            // 删除原asset
            compilation.deleteAsset(file.assetPath)
          })
          // 更新html
          compilation.updateAsset(
            'index.html',
            new RawSource(this.indexHtmlContent)
          )
          cb()
        }
      )
    })
  }
  findHtmlCss() {
    posthtml()
      .use((tree) => {
        return tree.walk((node) => {
          if (node.tag === 'link' && node.attrs.rel === 'stylesheet') {
            this.filenames.push(node.attrs.href)
          }
          return node
        })
      })
      .process(this.indexHtmlContent, {
        sync: true,
      }).html
  }
  file(filename, assetPath, source) {
    const getSelLength = (node) => {
      if (node.type === 'rule') {
        return node.selectors.length
      }
      if (node.type === 'atrule' && node.nodes) {
        return (
          1 +
          node.nodes.reduce((memo, n) => {
            return memo + getSelLength(n)
          }, 0)
        )
      }
      return 0
    }
    postcss({
      postcssPlugin: 'postcss-chunk',
      Once(css, { result }) {
        const chunks = []
        let count
        let chunk

        // Create a new chunk that holds current result.
        const nextChunk = () => {
          count = 0
          chunk = css.clone({ nodes: [] })
          chunks.push(chunk)
        }

        // Walk the nodes. When we overflow the selector count, then start a new
        // chunk. Collect the nodes into the current chunk.
        css.nodes.forEach((n) => {
          const selCount = getSelLength(n)
          if (!chunk || count + selCount > 4000) {
            nextChunk()
          }
          chunk.nodes.push(n)
          count += selCount
        })

        // Output the results.
        result.chunks = chunks.map((c, i) => {
          return c.toResult()
        })
      },
    })
      .process(source, { from: undefined })
      .then((result) => {
        if (result.chunks.length > 1) {
          this.splitFiles.push({
            filename,
            assetPath,
            chunks: result.chunks.map((chunk, i) => {
              const name = assetPath.replace(/(.*)(\.css)$/, `$1-${i}$2`)
              return {
                name,
                css: chunk.css,
              }
            }),
          })
        }
      })
  }
  deleteSourceHtml(filename) {
    this.indexHtmlContent = posthtml()
      .use((tree) => {
        return tree.walk((node) => {
          if (node.tag === 'link' && node.attrs.rel === 'stylesheet') {
            return node.attrs.href === filename ? null : node
          }
          return node
        })
      })
      .process(this.indexHtmlContent, { sync: true }).html
  }
  addLinkTag(href) {
    this.indexHtmlContent = posthtml()
      .use((tree) => {
        return tree.walk((node) => {
          if (node.tag === 'head') {
            node.content.push({
              tag: 'link',
              attrs: {
                href,
                rel: 'stylesheet',
              },
            })
          }
          return node
        })
      })
      .process(this.indexHtmlContent, { sync: true }).html
  }
}

export default TestPlugin
