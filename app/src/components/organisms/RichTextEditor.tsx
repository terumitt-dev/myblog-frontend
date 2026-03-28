// app/src/components/organisms/RichTextEditor.tsx
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/components/utils/cn";

interface RichTextEditorProps {
  content: string;
  onUpdate: (html: string) => void;
  onImageUpload: (file: File) => Promise<string | null>;
  disabled?: boolean;
  placeholder?: string;
}

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

const RichTextEditor = ({
  content,
  onUpdate,
  onImageUpload,
  disabled = false,
  placeholder = "記事の内容を入力してください",
}: RichTextEditorProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const linkInputRef = useRef<HTMLInputElement>(null);
  const handleImageFileRef = useRef<(file: File) => void>(() => {});

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({
        HTMLAttributes: {
          class: "max-w-full h-auto rounded-lg",
          loading: "lazy",
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-blue-600 hover:text-blue-800 underline",
          target: "_blank",
          rel: "noopener noreferrer",
        },
      }),
    ],
    content,
    editable: !disabled,
    onUpdate: ({ editor }) => {
      onUpdate(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "prose prose-lg max-w-none dark:prose-invert min-h-[300px] focus:outline-none p-4",
      },
      handleDrop: (_view, event, _slice, moved) => {
        if (moved || !event.dataTransfer?.files?.length) return false;

        const file = event.dataTransfer.files[0];
        if (file && ALLOWED_IMAGE_TYPES.includes(file.type)) {
          event.preventDefault();
          handleImageFileRef.current(file);
          return true;
        }
        return false;
      },
      handlePaste: (_view, event) => {
        const files = event.clipboardData?.files;
        if (!files?.length) return false;

        const file = files[0];
        if (file && ALLOWED_IMAGE_TYPES.includes(file.type)) {
          event.preventDefault();
          handleImageFileRef.current(file);
          return true;
        }
        return false;
      },
    },
  });

  // contentが外部から変更された場合にエディタを同期
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  // disabled状態の同期
  useEffect(() => {
    if (editor) {
      editor.setEditable(!disabled);
    }
  }, [disabled, editor]);

  // handleImageFileの最新参照をrefに保持（editorPropsのクロージャから参照）
  const handleImageFile = useCallback(
    async (file: File) => {
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        setUploadError("JPEG, PNG, GIF, WebP形式の画像を選択してください");
        return;
      }

      if (file.size > MAX_IMAGE_SIZE) {
        setUploadError("画像は5MB以下にしてください");
        return;
      }

      setIsUploading(true);
      setUploadError(null);

      // await前にカーソル位置を保持（アップロード中にカーソルが動いても正しい位置に挿入）
      const insertPosition = editor?.state.selection.from ?? null;

      try {
        const url = await onImageUpload(file);
        if (url && editor) {
          if (insertPosition !== null) {
            editor.commands.insertContentAt(insertPosition, {
              type: "image",
              attrs: { src: url, alt: file.name },
            });
          } else {
            editor.chain().focus().setImage({ src: url, alt: file.name }).run();
          }
        } else if (!url) {
          setUploadError("画像のアップロードに失敗しました");
        }
      } catch {
        setUploadError("画像のアップロードに失敗しました");
      } finally {
        setIsUploading(false);
      }
    },
    [editor, onImageUpload],
  );

  // refを最新に保つ（disabled/isUploading中はD&D/ペーストを遮断）
  useEffect(() => {
    handleImageFileRef.current = (file: File) => {
      if (disabled || isUploading) return;
      void handleImageFile(file);
    };
  }, [disabled, handleImageFile, isUploading]);

  const handleImageButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) handleImageFile(file);
  };

  const toggleLinkInput = useCallback(() => {
    if (showLinkInput) {
      setShowLinkInput(false);
      setLinkUrl("");
    } else {
      setShowLinkInput(true);
      setLinkUrl("");
      setTimeout(() => linkInputRef.current?.focus(), 0);
    }
  }, [showLinkInput]);

  const confirmLink = useCallback(() => {
    if (!editor || !linkUrl.trim()) return;

    const ALLOWED_PROTOCOLS = ["http:", "https:", "mailto:"];
    try {
      const url = new URL(linkUrl.trim(), window.location.origin);
      if (!ALLOWED_PROTOCOLS.includes(url.protocol)) return;

      editor.chain().focus().setLink({ href: url.toString() }).run();
      setShowLinkInput(false);
      setLinkUrl("");
    } catch {
      // 無効なURL
    }
  }, [editor, linkUrl]);

  if (!editor) return null;

  return (
    <div className="border border-gray-300 dark:border-gray-600 rounded-md overflow-hidden">
      {/* ツールバー */}
      <div className="flex flex-wrap gap-1 p-2 border-b border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          isActive={editor.isActive("heading", { level: 2 })}
          disabled={disabled}
          title="見出し2"
        >
          H2
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          isActive={editor.isActive("heading", { level: 3 })}
          disabled={disabled}
          title="見出し3"
        >
          H3
        </ToolbarButton>

        <ToolbarSeparator />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive("bold")}
          disabled={disabled}
          title="太字"
        >
          B
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive("italic")}
          disabled={disabled}
          title="イタリック"
        >
          I
        </ToolbarButton>

        <ToolbarSeparator />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive("bulletList")}
          disabled={disabled}
          title="箇条書き"
        >
          ・
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive("orderedList")}
          disabled={disabled}
          title="番号付きリスト"
        >
          1.
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive("blockquote")}
          disabled={disabled}
          title="引用"
        >
          &quot;
        </ToolbarButton>

        <ToolbarSeparator />

        <ToolbarButton
          onClick={toggleLinkInput}
          isActive={editor.isActive("link") || showLinkInput}
          disabled={disabled}
          title="リンク"
        >
          🔗
        </ToolbarButton>

        <ToolbarButton
          onClick={handleImageButtonClick}
          disabled={disabled || isUploading}
          title="画像を挿入"
        >
          {isUploading ? "⏳" : "🖼️"}
        </ToolbarButton>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          className="sr-only"
          onChange={handleFileInputChange}
          disabled={disabled || isUploading}
        />
      </div>

      {/* リンク入力フォーム */}
      {showLinkInput && (
        <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-600">
          <input
            ref={linkInputRef}
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                confirmLink();
              } else if (e.key === "Escape") {
                setShowLinkInput(false);
                setLinkUrl("");
              }
            }}
            placeholder="https://example.com"
            className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-500 rounded bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={confirmLink}
            disabled={!linkUrl.trim()}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            確定
          </button>
          <button
            type="button"
            onClick={() => { setShowLinkInput(false); setLinkUrl(""); }}
            className="px-2 py-1 text-sm text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-100"
          >
            ✕
          </button>
        </div>
      )}

      {/* アップロードエラー */}
      {uploadError && (
        <div className="px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm">
          {uploadError}
        </div>
      )}

      {/* アップロード中インジケーター */}
      {isUploading && (
        <div className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 text-sm">
          画像をアップロード中...
        </div>
      )}

      {/* エディタ本体 */}
      <div className={cn(
        "bg-white dark:bg-gray-700",
        disabled && "opacity-50 pointer-events-none",
      )}>
        <EditorContent
          editor={editor}
          placeholder={placeholder}
        />
      </div>
    </div>
  );
};

// ツールバーボタンコンポーネント
const ToolbarButton = ({
  onClick,
  isActive = false,
  disabled = false,
  title,
  children,
}: {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={cn(
      "px-2 py-1 text-sm rounded transition-colors",
      "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1",
      isActive
        ? "bg-blue-600 text-white"
        : "bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-500",
      disabled && "opacity-50 cursor-not-allowed",
    )}
  >
    {children}
  </button>
);

// セパレーター
const ToolbarSeparator = () => (
  <div className="w-px h-6 bg-gray-300 dark:bg-gray-500 self-center mx-1" />
);

export default RichTextEditor;
