import { Editor, getEventTransfer, getEventRange } from "slate-react";
import { Value, block } from "slate";
import isUrl from "is-url";
import Prism from 'prismjs';

import React from "react";
import initialValue from "./value.json";
import { isKeyHotkey } from "is-hotkey";
import imageExtensions from 'image-extensions';
import styled from 'react-emotion';
import { Button, Icon, Toolbar } from '../components';


/**
 * Define the default node type.
 *
 * @type {String}
 */

const DEFAULT_NODE = "paragraph";

/**
 * Toolbar button component.
 *
 * @type {Function}
 */

const ToolbarButton = props => (
  <span className="button" onMouseDown={props.onMouseDown}>
    <span className="material-icons">{props.icon}</span>
  </span>
)


/**
 * Define hotkey matchers.
 *
 * @type {Function}
 */

const isBoldHotkey = isKeyHotkey("mod+b");
const isItalicHotkey = isKeyHotkey("mod+i");
const isUnderlinedHotkey = isKeyHotkey("mod+u");
const isCodeHotkey = isKeyHotkey("mod+`");

/**
 * A change helper to standardize wrapping links.
 *
 * @param {Change} change
 * @param {String} href
 */

function wrapLink(change, href) {
  change.wrapInline({
    type: "link",
    data: { href }
  });

  change.collapseToEnd();
}

/**
 * A change helper to standardize unwrapping links.
 *
 * @param {Change} change
 */

function unwrapLink(change) {
  change.unwrapInline("link");
}

/**
 * A styled image block component.
 *
 * @type {Component}
 */

const Image = styled('img')`
  display: block;
  max-width: 100%;
  max-height: 20em;
  box-shadow: ${props => (props.selected ? '0 0 0 2px blue;' : 'none')};
  `

/*
 * A function to determine whether a URL has an image extension.
 *
 * @param {String} url
 * @return {Boolean}
 */

function isImage(url) {
  return !!imageExtensions.find(url.endsWith)
}

/**
 * A change function to standardize inserting images.
 *
 * @param {Change} change
 * @param {String} src
 * @param {Range} target
 */

function insertImage(change, src, target) {
  if (target) {
    change.select(target)
  }

  change.insertBlock({
    type: 'image',
    isVoid: true,
    data: { src },
  })
}

/**
 * A styled emoji inline component.
 *
 * @type {Component}
 */

const Emoji = styled('span')`
  outline: ${props => (props.selected ? '2px solid blue' : 'none')};
`

/**
 * Emojis.
 *
 * @type {Array}
 */

const EMOJIS = [
  '😃',
  '😬',
  '😂',
  '😅',
  '😆',
  '😍',
  '😱',
  '👋',
  '👏',
  '👍',
  '🙌',
  '👌',
  '🙏',
  '👻',
  '🍔',
  '🍑',
  '🔑',
]

/**
 * No ops.
 *
 * @type {Function}
 */

const noop = e => e.preventDefault()

/**
 * Define our code components.
 *
 * @param {Object} props
 * @return {Element}
 */

function CodeBlock(props) {
  const { editor, node } = props
  const language = node.data.get('language')

  function onChange(event) {
    editor.change(c =>
      c.setNodeByKey(node.key, { data: { language: event.target.value } })
    )
  }

  return (
    <div style={{ position: 'relative' }}>
      <pre>
        <code {...props.attributes}>{props.children}</code>
      </pre>
      <div
        contentEditable={false}
        style={{ position: 'absolute', top: '5px', right: '5px' }}
      >
        <select value={language} onChange={onChange}>
          <option value="css">CSS</option>
          <option value="js">JavaScript</option>
          <option value="html">HTML</option>
        </select>
      </div>
    </div>
  )
}

function CodeBlockLine(props){
  return <div {...props.attributes}>{props.children}</div>
}

/**
 * A helper function to return the content of a Prism `token`.
 *
 * @param {Object} token
 * @return {String}
 */

function getContent(token) {
  if (typeof token == 'string') {
    return token
  } else if (typeof token.content == 'string') {
    return token.content
  } else {
    return token.content.map(getContent).join('')
  }
}




/**
 * The rich text example.
 *
 * @type {Component}
 */

class RichTextExample extends React.Component {
  /**
   * Deserialize the initial editor value.
   *
   * @type {Object}
   */

  state = {
    value: Value.fromJSON(initialValue),
    isEmoji: false
  };

  /**
   * Check if the current selection has a mark with `type` in it.
   *
   * @param {String} type
   * @return {Boolean}
   */

  hasMark = type => {
    const { value } = this.state;
    return value.activeMarks.some(mark => mark.type == type);
  };

  /**
   * Check if the any of the currently selected blocks are of `type`.
   *
   * @param {String} type
   * @return {Boolean}
   */

  hasBlock = type => {
    const { value } = this.state;
    return value.blocks.some(node => node.type == type);
  };

  /**
   * Check whether the current selection has a link in it.
   *
   * @return {Boolean} hasLinks
   */

  hasLinks = () => {
    const { value } = this.state;
    return value.inlines.some(inline => inline.type == "link");
  };


  /**
   * On change, save the new `value`.
   *
   * @param {Change} change
   */

  onChange = ({ value }) => {
    this.setState({ value });
  };

  /**
   * On key down, if it's a formatting command toggle a mark.
   *
   * @param {Event} event
   * @param {Change} change
   * @return {Change}
   */

  onKeyDown = (event, change) => {
    const { value } = change;
    const { startBlock } = value;
    if (event.key != 'Enter') return
    if (startBlock.type != 'code') return
    if (value.isExpanded) change.delete();
    change.insertText('\n');
    let mark;

    if (isBoldHotkey(event)) {
      mark = "bold";
    } else if (isItalicHotkey(event)) {
      mark = "italic";
    } else if (isUnderlinedHotkey(event)) {
      mark = "underlined";
    } else if (isCodeHotkey(event)) {
      mark = "code";
    } else {
      return;
    }

    event.preventDefault();
    change.toggleMark(mark);
    return true;
  };

  /**
   * When a mark button is clicked, toggle the current mark.
   *
   * @param {Event} event
   * @param {String} type
   */

  onClickMark = (event, type) => {
    event.preventDefault();
    const { value } = this.state;
    const change = value.change().toggleMark(type);
    this.onChange(change);
  };

  /**
   * When a block button is clicked, toggle the block type.
   *
   * @param {Event} event
   * @param {String} type
   */

  onClickBlock = (event, type) => {
    event.preventDefault();
    const { value } = this.state;
    const change = value.change();
    const { document } = value;

    // Handle everything but list buttons.
    if (type != "bulleted-list" && type != "numbered-list") {
      const isActive = this.hasBlock(type);
      const isList = this.hasBlock("list-item");

      if (isList) {
        change
          .setBlocks(isActive ? DEFAULT_NODE : type)
          .unwrapBlock("bulleted-list")
          .unwrapBlock("numbered-list");
      } else {
        change.setBlocks(isActive ? DEFAULT_NODE : type);
      }
    } else {
      // Handle the extra wrapping required for list buttons.
      const isList = this.hasBlock("list-item");
      const isType = value.blocks.some(block => {
        return !!document.getClosest(block.key, parent => parent.type == type);
      });

      if (isList && isType) {
        change
          .setBlocks(DEFAULT_NODE)
          .unwrapBlock("bulleted-list")
          .unwrapBlock("numbered-list");
      } else if (isList) {
        change
          .unwrapBlock(
            type == "bulleted-list" ? "numbered-list" : "bulleted-list"
          )
          .wrapBlock(type);
      } else {
        change.setBlocks("list-item").wrapBlock(type);
      }
    }

    this.onChange(change);
  };

  /**
   * When clicking a link, if the selection has a link in it, remove the link.
   * Otherwise, add a new link with an href and text.
   *
   * @param {Event} event
   */

  onClickLink = event => {
    event.preventDefault();
    const { value } = this.state;
    const hasLinks = this.hasLinks();
    const change = value.change();

    if (hasLinks) {
      change.call(unwrapLink);
    } else if (value.isExpanded) {
      const href = window.prompt("Enter the URL of the link:");
      change.call(wrapLink, href);
    } else {
      const href = window.prompt("Enter the URL of the link:");
      const text = window.prompt("Enter the text for the link:");

      change
        .insertText(text)
        .extend(0 - text.length)
        .call(wrapLink, href);
    }

    this.onChange(change);
  };

  /**
   * On paste, if the text is a link, wrap the selection in a link.
   *
   * @param {Event} event
   * @param {Change} change
   */

  onPaste = (event, change) => {
    if (change.value.isCollapsed) return;

    const transfer = getEventTransfer(event);
    const { type, text } = transfer;
    if (type != "text" && type != "html") return;
    if (!isUrl(text)) return;

    if (this.hasLinks()) {
      change.call(unwrapLink);
    }

    change.call(wrapLink, text);
    return true;
  };

  /**
   * On clicking the image button, prompt for an image and insert it.
   *
   * @param {Event} event
   */

  onClickImage = event => {
    event.preventDefault()
    const src = window.prompt('Enter the URL of the image:')
    if (!src) return

    const change = this.state.value.change().call(insertImage, src)

    this.onChange(change)
  }


  /**
   * On drop, insert the image wherever it is dropped.
   *
   * @param {Event} event
   * @param {Change} change
   * @param {Editor} editor
   */

  onDropOrPaste = (event, change, editor) => {
    const target = getEventRange(event, change.value)
    if (!target && event.type == 'drop') return

    const transfer = getEventTransfer(event)
    const { type, text, files } = transfer

    if (type == 'files') {
      for (const file of files) {
        const reader = new FileReader()
        const [mime] = file.type.split('/')
        if (mime != 'image') continue

        reader.addEventListener('load', () => {
          editor.change(c => {
            c.call(insertImage, reader.result, target)
          })
        })

        reader.readAsDataURL(file)
      }
    }

    if (type == 'text') {
      if (!isUrl(text)) return
      if (!isImage(text)) return
      change.call(insertImage, text, target)
    }
  }

  onClickEmojiIcon = () => {
    const { isEmoji } = this.state;
    if (isEmoji) {
      return (
        <div className="menu toolbar-menu">
          {EMOJIS.map((emoji, i) => {
            const onMouseDown = e => this.onClickEmoji(e, emoji)
            return (
              // eslint-disable-next-line react/jsx-no-bind
              <span key={i} className="button" onMouseDown={onMouseDown}>
                <span className="material-icons">{emoji}</span>
              </span>
            )
          })}
        </div>
      )

    } else {
      return;
    }
   
  }

  /**
   * When clicking a emoji, insert it
   *
   * @param {Event} e
   */

  onClickEmoji = (e, code) => {
    e.preventDefault()
    const { value } = this.state
    const change = value.change()

    change
      .insertInline({
        type: 'emoji',
        isVoid: true,
        data: { code },
      })
      .collapseToStartOfNextText()
      .focus()

    this.onChange(change)
  }

  onClickCodeIcon = () => {
    console.log('Code icon is called');
  }

  /**
   * On redo in history.
   *
   */

  onClickRedo = event => {
    event.preventDefault()
    const { value } = this.state
    const change = value.change().redo()
    this.onChange(change)
  }

  /**
   * On undo in history.
   *
   */

  onClickUndo = event => {
    event.preventDefault()
    const { value } = this.state
    const change = value.change().undo()
    this.onChange(change)
  }

  /**
   * Render.
   *
   * @return {Element}
   */

  render() {
    return (
      <div>
        {this.renderToolbar()}
        {this.onClickEmojiIcon()}
        {this.renderEditor()}
      </div>
    );
  }

  /**
   * Render the toolbar.
   *
   * @return {Element}
   */

  renderToolbar = () => {
    return (
      <div className="menu toolbar-menu">
        {this.renderMarkButton("bold", "format_bold")}
        {this.renderMarkButton("italic", "format_italic")}
        {this.renderMarkButton("underlined", "format_underlined")}
        {this.renderMarkButton("code", "code")}
        {this.renderBlockButton("heading-one", "looks_one")}
        {this.renderBlockButton("heading-two", "looks_two")}
        {this.renderBlockButton("block-quote", "format_quote")}
        {this.renderBlockButton("numbered-list", "format_list_numbered")}
        {this.renderBlockButton("bulleted-list", "format_list_bulleted")}
        {this.renderLinkButton("link", "link")}
        {this.renderImageButton("image", "image")}
        {this.renderEmojiButton("emoji", "face")}
        {this.renderCodeIcon("code", "settings_ethernet")}
        {this.renderUndoIcon("undo", "undo")}
        {this.renderRedoIcon("redo", "redo")}
        {this.renderUndoRedoSize()}
      </div>
    );
  };

  /**
   * Render a mark-toggling toolbar button.
   *
   * @param {String} type
   * @param {String} icon
   * @return {Element}
   */

  renderMarkButton = (type, icon) => {
    const isActive = this.hasMark(type);
    const onMouseDown = event => {
      this.setState({ isEmoji: false });
      this.onClickMark(event, type);
    }

    return (
      // eslint-disable-next-line react/jsx-no-bind
      <span className="button" onMouseDown={onMouseDown} data-active={isActive}>
        <span className="material-icons">{icon}</span>
      </span>
    );
  };

  /**
   * Render a block-toggling toolbar button.
   *
   * @param {String} type
   * @param {String} icon
   * @return {Element}
   */

  renderBlockButton = (type, icon) => {
    let isActive = this.hasBlock(type);

    if (["numbered-list", "bulleted-list"].includes(type)) {
      const { value } = this.state;
      const parent = value.document.getParent(value.blocks.first().key);
      isActive = this.hasBlock("list-item") && parent && parent.type === type;
    }

    const onMouseDown = event => {
      this.setState({ isEmoji: false });
      this.onClickBlock(event, type);
    }

    return (
      // eslint-disable-next-line react/jsx-no-bind
      <span className="button" onMouseDown={onMouseDown} data-active={isActive}>
        <span className="material-icons">{icon}</span>
      </span>
    );
  };

  /**
   * Render a link button.
   * @return {Element}
   */

  renderLinkButton = (type, icon) => {
    const isActive = this.hasLinks(type);

    const onMouseDown = event => {
      this.setState({ isEmoji: false });
      this.onClickLink(event, type);
    }

    return (
      // eslint-disable-next-line react/jsx-no-bind
      <span className="button" onMouseDown={onMouseDown} data-active={isActive}>
        <span className="material-icons">{icon}</span>
      </span>
    );
  };

    /**
   * Render a link button.
   * @return {Element}
   */

  renderImageButton = (type, icon) => {

    const onMouseDown = event => {
      this.setState({ isEmoji: false });
      this.onClickImage(event, type);
    }

    return (
      // eslint-disable-next-line react/jsx-no-bind
      <span className="button" onMouseDown={onMouseDown}>
        <span className="material-icons">{icon}</span>
      </span>
    );
  };

   /**
   * Render emoji
   * @return {Element}
   */

  renderEmojiButton = (type, icon) => {
    const onMouseDown = (event) =>  {
      this.state.isEmoji ? this.setState({ isEmoji: false }) : this.setState({ isEmoji: true });
      this.onClickEmojiIcon(event, type);
    }
    return (
      // eslint-disable-next-line react/jsx-no-bind
      <span className="button" onMouseDown={onMouseDown}>
        <span className="material-icons">{icon}</span>
      </span>
    );
  };

    /**
   * Render code icon
   * @return {Element}
   */

  renderCodeIcon = (type, icon) => {
    console.log('this..............in rendercodeicon............', this);
    console.log('type,,,,,,,,in rendercodeicon', type);
    const onMouseDown = (event) =>  {
    this.setState({ isEmoji: false });
      this.onClickCodeIcon(event, type);
    }
    return (
      // eslint-disable-next-line react/jsx-no-bind
      <span className="button" onMouseDown={onMouseDown}>
        <span className="material-icons">{icon}</span>
      </span>
    );
  };

  /**
   * Render UNDO icon
   * @return {Element}
   */

  renderUndoIcon = (type, icon) => {
    return( <ToolbarButton icon={icon} onMouseDown={this.onClickUndo} />);
  }

  /**
   * Render REDO icon
   * @return {Element}
   */

  renderRedoIcon = (type, icon) => {
    return(<ToolbarButton icon={icon} onMouseDown={this.onClickRedo} />);
  }

  /**
   * Render UNDO and REDO times
   */
  
   renderUndoRedoSize = () => {
    const { value } = this.state
     return(
     <p><span className="button">Undos: {value.history.undos.size}</span>
     <span className="button">Redos: {value.history.redos.size}</span></p>
)
   }



  /**
   * Render the Slate editor.
   *
   * @return {Element}
   */

  renderEditor = () => {
    return (
      <div className="editor">
        <Editor
          placeholder="Enter some rich text..."
          value={this.state.value}
          onChange={this.onChange}
          onDrop={this.onDropOrPaste}
          onPaste={this.onDropOrPaste}
          onKeyDown={this.onKeyDown}
          renderNode={this.renderNode}
          onPaste={this.onPaste}
          renderMark={this.renderMark}
          decorateNode={this.decorateNode}
          spellCheck
          autoFocus
        />
      </div>
    );
  };

  /**
   * Render a Slate node.
   *
   * @param {Object} props
   * @return {Element}
   */

  renderNode = props => {
    const { attributes, children, node, isFocused } = props;
    console.log('props.node.type......rendernode', props.node.type);

    switch (props.node.type) {
      case "block-quote":
        return <blockquote {...attributes}>{children}</blockquote>;
      case "bulleted-list":
        return <ul {...attributes}>{children}</ul>;
      case "heading-one":
        return <h1 {...attributes}>{children}</h1>;
      case "heading-two":
        return <h2 {...attributes}>{children}</h2>;
      case "list-item":
        return <li {...attributes}>{children}</li>;
      case "numbered-list":
        return <ol {...attributes}>{children}</ol>;
      case 'code':
        return <CodeBlock {...props} />;
      case 'code_line':
        return <CodeBlockLine {...props} />;
      case "link": {
        const { data } = node;
        const href = data.get("href");
        return (
          <a {...attributes} href={href}>
            {children}
          </a>
        );
      }
      case 'image': {
        const src = node.data.get('src')
        return <Image src={src} selected={isFocused} {...attributes} />;
    }
      case 'emoji': {
      const code = node.data.get('code')
      return (
        <Emoji
          {...props.attributes}
          selected={isFocused}
          contentEditable={false}
          onDrop={noop}
        >
          {code}
        </Emoji>
      )
    }
  }
  };

  /**
   * Render a Slate mark.
   *
   * @param {Object} props
   * @return {Element}
   */

  renderMark = props => {
    const { children, mark, attributes } = props;

    switch (mark.type) {
      case "bold":
        return <strong {...attributes}>{children}</strong>;
      case "code":
        return <code {...attributes}>{children}</code>;
      case "italic":
        return <em {...attributes}>{children}</em>;
      case "underlined":
        return <u {...attributes}>{children}</u>;
      case 'comment':
        return (
          <span {...attributes} style={{ opacity: '0.33' }}>
            {children}
          </span>
        )
      case 'keyword':
        return (
          <span {...attributes} style={{ fontWeight: 'bold' }}>
            {children}
          </span>
        )
      case 'tag':
        return (
          <span {...attributes} style={{ fontWeight: 'bold' }}>
            {children}
          </span>
        )
      case 'punctuation':
        return (
          <span {...attributes} style={{ opacity: '0.75' }}>
            {children}
          </span>
        )
    }
  };

  decorateNode = node => {
    if (node.type != 'code') return

    const language = node.data.get('language')
    const texts = node.getTexts().toArray()
    const string = texts.map(t => t.text).join('\n')
    const grammar = Prism.languages[language]
    const tokens = Prism.tokenize(string, grammar)
    const decorations = []
    let startText = texts.shift()
    let endText = startText
    let startOffset = 0
    let endOffset = 0
    let start = 0

    for (const token of tokens) {
      startText = endText
      startOffset = endOffset

      const content = getContent(token)
      const newlines = content.split('\n').length - 1
      const length = content.length - newlines
      const end = start + length

      let available = startText.text.length - startOffset
      let remaining = length

      endOffset = startOffset + remaining

      while (available < remaining && texts.length > 0) {
        endText = texts.shift()
        remaining = length - available
        available = endText.text.length
        endOffset = remaining
      }

      if (typeof token != 'string') {
        const range = {
          anchorKey: startText.key,
          anchorOffset: startOffset,
          focusKey: endText.key,
          focusOffset: endOffset,
          marks: [{ type: token.type }],
        }

        decorations.push(range)
      }

      start = end
    }

    return decorations
  }
}

/**
 * Export.
 */

export default RichTextExample;
