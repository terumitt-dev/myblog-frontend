// app/src/components/utils/sanitizer.ts
import DOMPurify from "dompurify";

// HTMLタグを除去してプレーンテキストにする
export const stripHtmlTags = (html: string): string => {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, "").trim();
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

    // リンクのスキーム検証 + target="_blank" に noopener noreferrer を強制付与
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
