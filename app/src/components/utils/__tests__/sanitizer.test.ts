// app/src/components/utils/__tests__/sanitizer.test.ts
import { describe, it, expect } from "vitest";
import { sanitizeHtml, sanitizeInput } from "../sanitizer";

describe("sanitizeHtml", () => {
  it("空文字列を返す（空入力時）", () => {
    expect(sanitizeHtml("")).toBe("");
  });

  it("許可されたHTMLタグを保持する", () => {
    const input = "<p>テスト</p>";
    expect(sanitizeHtml(input)).toBe("<p>テスト</p>");
  });

  it("見出しタグを保持する", () => {
    const input = "<h1>見出し1</h1><h2>見出し2</h2><h3>見出し3</h3>";
    expect(sanitizeHtml(input)).toContain("<h1>");
    expect(sanitizeHtml(input)).toContain("<h2>");
    expect(sanitizeHtml(input)).toContain("<h3>");
  });

  it("リンクタグとhref属性を保持する", () => {
    const input = '<a href="https://example.com" target="_blank" rel="noopener">リンク</a>';
    const result = sanitizeHtml(input);
    expect(result).toContain("<a");
    expect(result).toContain('href="https://example.com"');
    expect(result).toContain("リンク</a>");
  });

  it("画像タグとsrc/alt属性を保持する", () => {
    const input = '<img src="https://example.com/image.png" alt="画像" loading="lazy">';
    const result = sanitizeHtml(input);
    expect(result).toContain("<img");
    expect(result).toContain('src="https://example.com/image.png"');
    expect(result).toContain('alt="画像"');
  });

  it("リスト要素を保持する", () => {
    const input = "<ul><li>項目1</li><li>項目2</li></ul>";
    const result = sanitizeHtml(input);
    expect(result).toContain("<ul>");
    expect(result).toContain("<li>");
  });

  it("コードブロックを保持する", () => {
    const input = "<pre><code>const x = 1;</code></pre>";
    const result = sanitizeHtml(input);
    expect(result).toContain("<pre>");
    expect(result).toContain("<code>");
  });

  it("strong/emタグを保持する", () => {
    const input = "<strong>太字</strong><em>斜体</em>";
    const result = sanitizeHtml(input);
    expect(result).toContain("<strong>太字</strong>");
    expect(result).toContain("<em>斜体</em>");
  });

  it("scriptタグを除去する", () => {
    const input = '<p>安全</p><script>alert("XSS")</script>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain("<script");
    expect(result).not.toContain("alert");
    expect(result).toContain("<p>安全</p>");
  });

  it("styleタグを除去する", () => {
    const input = "<style>body { display: none; }</style><p>テスト</p>";
    const result = sanitizeHtml(input);
    expect(result).not.toContain("<style");
    expect(result).toContain("<p>テスト</p>");
  });

  it("onerrorなどのイベントハンドラ属性を除去する", () => {
    const input = '<img src="x" onerror="alert(1)">';
    const result = sanitizeHtml(input);
    expect(result).not.toContain("onerror");
    expect(result).not.toContain("alert");
  });

  it("onclickイベントハンドラ属性を除去する", () => {
    const input = '<p onclick="alert(1)">テスト</p>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain("onclick");
  });

  it("style属性を除去する", () => {
    const input = '<p style="color: red;">テスト</p>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain("style=");
    expect(result).toContain("<p>テスト</p>");
  });

  it("svg/mathタグを除去する", () => {
    const input = '<svg onload="alert(1)"><circle r="50"/></svg><p>安全</p>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain("<svg");
    expect(result).toContain("<p>安全</p>");
  });

  it("objectタグを除去する", () => {
    const input = '<object data="malicious.swf"></object><p>テスト</p>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain("<object");
  });

  it("data属性を除去する", () => {
    const input = '<p data-custom="value">テスト</p>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain("data-custom");
  });

  it("javascript: URLを除去する", () => {
    const input = '<a href="javascript:alert(1)">危険なリンク</a>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain("javascript:");
  });

  it("figure/figcaptionタグを保持する", () => {
    const input = '<figure><img src="test.png" alt="test"><figcaption>キャプション</figcaption></figure>';
    const result = sanitizeHtml(input);
    expect(result).toContain("<figure>");
    expect(result).toContain("<figcaption>");
  });

  it("blockquoteタグを保持する", () => {
    const input = "<blockquote>引用テキスト</blockquote>";
    const result = sanitizeHtml(input);
    expect(result).toContain("<blockquote>引用テキスト</blockquote>");
  });

  describe("プレーンテキストURL自動リンク化", () => {
    it("http URLをリンクに変換する", () => {
      const result = sanitizeHtml("<p>https://example.com を参照</p>");
      expect(result).toContain('<a href="https://example.com"');
      expect(result).toContain('target="_blank"');
      expect(result).toContain("noopener");
      expect(result).toContain("noreferrer");
    });

    it("既存の <a> タグ内の URL は二重リンク化しない", () => {
      const input = '<a href="https://example.com">https://example.com</a>';
      const result = sanitizeHtml(input);
      // <a> が1つだけであることを確認（二重ネストにならない）
      const matches = result.match(/<a /g) ?? [];
      expect(matches.length).toBe(1);
    });

    it("<pre> 内の URL はリンク化しない", () => {
      const input = "<pre>https://example.com</pre>";
      const result = sanitizeHtml(input);
      expect(result).not.toContain("<a ");
      expect(result).toContain("https://example.com");
    });

    it("<code> 内の URL はリンク化しない", () => {
      const input = "<code>https://example.com</code>";
      const result = sanitizeHtml(input);
      expect(result).not.toContain("<a ");
      expect(result).toContain("https://example.com");
    });

    it("末尾の句読点は URL に含めない", () => {
      const result = sanitizeHtml("<p>詳しくは https://example.com/page を見てください。</p>");
      expect(result).toContain('href="https://example.com/page"');
      // 末尾の句点はリンク外のテキストとして残る
      expect(result).toContain("。");
    });

    it("末尾のカンマは URL に含めない", () => {
      const result = sanitizeHtml("<p>https://example.com, https://example.org の2つ</p>");
      expect(result).toContain('href="https://example.com"');
      expect(result).toContain('href="https://example.org"');
    });
  });
});

describe("sanitizeInput", () => {
  it("HTMLタグを全て除去してプレーンテキストにする", () => {
    const input = "<p>テスト<strong>太字</strong></p>";
    const result = sanitizeInput(input);
    expect(result).toBe("テスト太字");
    expect(result).not.toContain("<");
  });

  it("scriptタグを除去する", () => {
    const input = '<script>alert("XSS")</script>テスト';
    const result = sanitizeInput(input);
    expect(result).not.toContain("script");
    expect(result).toContain("テスト");
  });

  it("空文字列を返す（空入力時）", () => {
    expect(sanitizeInput("")).toBe("");
  });
});
