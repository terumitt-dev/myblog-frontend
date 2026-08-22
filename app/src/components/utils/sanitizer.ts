// app/src/components/utils/sanitizer.ts
import DOMPurify from "dompurify";

// HTMLタグを除去してプレーンテキストにする
export const stripHtmlTags = (html: string): string => {
  if (!html) return "";
  const doc = new DOMParser().parseFromString(html, "text/html");
  return (doc.body.textContent ?? "").trim();
};

// 入力サニタイズ（完全にプレーンテキスト化）
export const sanitizeInput = (input: string): string => {
  if (!input) return "";

  try {
    // 入力値は完全にプレーンテキスト化
    const sanitized = DOMPurify.sanitize(input, {
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: [],
      KEEP_CONTENT: true,
      SANITIZE_DOM: true,
      SANITIZE_NAMED_PROPS: true,
      FORBID_CONTENTS: ["script", "style", "svg", "math"],
      FORBID_TAGS: [
        "script",
        "object",
        "embed",
        "base",
        "link",
        "meta",
        "style",
        "svg",
        "math",
      ],
      FORBID_ATTR: [
        "onerror",
        "onload",
        "onclick",
        "onmouseover",
        "onmouseout",
        "onfocus",
        "onblur",
        "onchange",
        "onsubmit",
        "onkeydown",
        "onkeyup",
        "onkeypress",
        "style",
        "class",
        "id",
      ],
    });

    return sanitized.trim();
  } catch (error) {
    console.error("Input sanitization error:", error);
    // セキュアなフォールバック処理
    return String(input)
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/<[^>]*>/g, "")
      .replace(/javascript:/gi, "")
      .replace(/data:/gi, "")
      .replace(/vbscript:/gi, "")
      .replace(/on\w+\s*=/gi, "")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&")
      .trim();
  }
};

// HTML表示用サニタイズ（安全なタグを許可して描画用に使用）
export const sanitizeHtml = (html: string): string => {
  if (!html) return "";

  try {
    const sanitized = DOMPurify.sanitize(html, {
      ALLOWED_TAGS: [
        "p", "br", "h1", "h2", "h3", "h4", "h5", "h6",
        "a", "img", "figure", "figcaption",
        "ul", "ol", "li", "blockquote", "pre", "code",
        "em", "strong",
      ],
      ALLOWED_ATTR: [
        "href", "src", "alt", "width", "height", "class",
        "target", "rel", "loading",
      ],
      ALLOW_DATA_ATTR: false,
      FORBID_TAGS: ["script", "style", "svg", "math", "object", "embed", "base", "link", "meta"],
      FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover", "style"],
    });

    // DOMPurify後の追加検証（多層防御）
    const doc = new DOMParser().parseFromString(sanitized, "text/html");
    const allowedLinkProtocols = new Set(["http:", "https:", "mailto:"]);
    const allowedImageProtocols = new Set(["http:", "https:"]);

    // プレーンテキストの URL を <a> タグに変換（既存リンク・pre・code 内は除外）
    // スキーム検証ループより先に実行することで、生成した <a> も検証対象に含める
    // 全角句読点（。、！？」』】）も除外して日本語文末の取り込みを防ぐ
    // 全角句読点・日本語文字（ひらがな・カタカナ・漢字）を除外して
    // URL直後の助詞等（「を参照」「のページ」）が href に取り込まれるのを防ぐ
    const URL_RE = /https?:\/\/[^\s<>"'()\[\]。、！？「」『』【】（）぀-ゟ゠-ヿ一-鿿]+/gi;
    const TRAILING_PUNCT = /[.,!?:;。、！？]+$/;
    const SKIP_TAGS = new Set(["A", "PRE", "CODE"]);

    const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        let el = node.parentElement;
        while (el && el !== doc.body) {
          if (SKIP_TAGS.has(el.tagName)) return NodeFilter.FILTER_REJECT;
          el = el.parentElement;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    });

    const textNodes: Text[] = [];
    let tn: Node | null;
    while ((tn = walker.nextNode())) textNodes.push(tn as Text);

    for (const textNode of textNodes) {
      const text = textNode.textContent ?? "";
      if (!URL_RE.test(text)) { URL_RE.lastIndex = 0; continue; }
      URL_RE.lastIndex = 0;

      const frag = doc.createDocumentFragment();
      let last = 0;
      let m: RegExpExecArray | null;
      while ((m = URL_RE.exec(text)) !== null) {
        const raw = m[0].replace(TRAILING_PUNCT, "");
        if (m.index > last) frag.appendChild(doc.createTextNode(text.slice(last, m.index)));
        const a = doc.createElement("a");
        a.href = raw;
        a.textContent = raw;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        frag.appendChild(a);
        // trailing を frag に追加済みのため last はマッチ全体の終端まで進める
        last = m.index + m[0].length;
        const trailing = m[0].slice(raw.length);
        if (trailing) frag.appendChild(doc.createTextNode(trailing));
      }
      if (last < text.length) frag.appendChild(doc.createTextNode(text.slice(last)));
      textNode.parentNode?.replaceChild(frag, textNode);
    }

    // リンクのスキーム検証 + target="_blank" に noopener noreferrer を強制付与
    // 自動リンク化で生成した <a> も含めて検証する
    doc.querySelectorAll("a[href]").forEach((anchor) => {
      try {
        const href = anchor.getAttribute("href") ?? "";
        const url = new URL(href, window.location.origin);
        if (!allowedLinkProtocols.has(url.protocol)) {
          anchor.removeAttribute("href");
          anchor.removeAttribute("target");
          anchor.removeAttribute("rel");
          return;
        }
        if (anchor.getAttribute("target") === "_blank") {
          const relValues = new Set(
            (anchor.getAttribute("rel") ?? "").split(/\s+/).filter(Boolean),
          );
          relValues.add("noopener");
          relValues.add("noreferrer");
          anchor.setAttribute("rel", Array.from(relValues).join(" "));
        }
      } catch {
        anchor.removeAttribute("href");
      }
    });

    // 画像のスキーム検証（data:等を除去）
    doc.querySelectorAll("img[src]").forEach((img) => {
      try {
        const src = img.getAttribute("src") ?? "";
        const url = new URL(src, window.location.origin);
        if (!allowedImageProtocols.has(url.protocol)) {
          img.remove();
        }
      } catch {
        img.remove();
      }
    });

    return doc.body.innerHTML;
  } catch (error) {
    console.error("HTML sanitization error:", error);
    return "";
  }
};

// バリデーション関数（互換性維持）
export const validateAndSanitize = (
  input: string,
  maxLength: number,
  fieldName: string = "入力値",
): { isValid: boolean; sanitized: string; error?: string } => {
  if (!input || typeof input !== "string") {
    return { isValid: false, sanitized: "", error: `${fieldName}が必要です` };
  }

  const sanitized = sanitizeInput(input);

  if (sanitized.length === 0) {
    return {
      isValid: false,
      sanitized,
      error: `${fieldName}を入力してください`,
    };
  }

  if (sanitized.length > maxLength) {
    return {
      isValid: false,
      sanitized,
      error: `${fieldName}は${maxLength}文字以内で入力してください`,
    };
  }

  return { isValid: true, sanitized };
};

// カテゴリバリデーション
export const validateCategory = (
  category: string,
): { isValid: boolean; sanitized: string; error?: string } => {
  const allowedCategories = ["tech", "hobby", "other"];
  const sanitized = sanitizeInput(category);

  if (!allowedCategories.includes(sanitized)) {
    return {
      isValid: false,
      sanitized,
      error: "無効なカテゴリです",
    };
  }

  return { isValid: true, sanitized };
};

// limits形式対応のバリデーション関数
export const validateWithLimits = (
  input: string,
  limits: { min: number; max: number },
  fieldName: string = "入力値",
): { isValid: boolean; sanitized: string; error?: string } => {
  if (!input || typeof input !== "string") {
    return { isValid: false, sanitized: "", error: `${fieldName}が必要です` };
  }

  const sanitized = sanitizeInput(input);

  if (sanitized.length < limits.min) {
    return {
      isValid: false,
      sanitized,
      error: `${fieldName}は最低${limits.min}文字以上入力してください`,
    };
  }

  if (sanitized.length > limits.max) {
    return {
      isValid: false,
      sanitized,
      error: `${fieldName}は${limits.max}文字以内で入力してください`,
    };
  }

  return { isValid: true, sanitized };
};
