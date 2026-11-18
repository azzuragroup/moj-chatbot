import { Fragment, type ReactNode } from "react";
import { parseMarkdown, type Block, type Inline } from "./markdown";

const isHttp = (url: string) => /^https?:\/\//i.test(url);

function renderInline(parts: Inline[]): ReactNode[] {
  return parts.map((p, i) => {
    switch (p.type) {
      case "bold":
        return <strong key={i}>{renderInline(p.children)}</strong>;
      case "italic":
        return <em key={i}>{renderInline(p.children)}</em>;
      case "code":
        return <code key={i}>{p.text}</code>;
      case "link":
        // Tylko linki http(s); inne schematy (np. javascript:) zostają tekstem.
        return isHttp(p.href) ? (
          <a key={i} href={p.href} target="_blank" rel="noopener noreferrer">
            {p.text}
          </a>
        ) : (
          <Fragment key={i}>{p.text}</Fragment>
        );
      default:
        return <Fragment key={i}>{p.text}</Fragment>;
    }
  });
}

function renderLines(lines: Inline[][]) {
  return lines.map((line, i) => (
    <Fragment key={i}>
      {i > 0 && <br />}
      {renderInline(line)}
    </Fragment>
  ));
}

function renderBlock(block: Block, i: number) {
  switch (block.type) {
    case "heading": {
      const Tag = block.level <= 2 ? "h3" : "h4";
      return <Tag key={i}>{renderInline(block.content)}</Tag>;
    }
    case "list":
      return block.ordered ? (
        <ol key={i} start={block.start}>
          {block.items.map((item, j) => (
            <li key={j}>{renderInline(item)}</li>
          ))}
        </ol>
      ) : (
        <ul key={i}>
          {block.items.map((item, j) => (
            <li key={j}>{renderInline(item)}</li>
          ))}
        </ul>
      );
    case "quote":
      return <blockquote key={i}>{renderLines(block.lines)}</blockquote>;
    case "hr":
      return <hr key={i} />;
    default:
      return <p key={i}>{renderLines(block.lines)}</p>;
  }
}

/** Odpowiedź agenta z formatowaniem markdown – bez wstawiania surowego HTML. */
export default function MarkdownText({ text }: { text: string }) {
  return <div className="md">{parseMarkdown(text).map(renderBlock)}</div>;
}
