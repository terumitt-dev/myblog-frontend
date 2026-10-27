// app/src/components/atoms/Input.tsx
import React from "react";
import { cn } from "@/components/utils/cn";

type Props = {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  id: string; // 必須: ラベルとの関連付けに必要
  label?: string; // オプション: ラベルテキスト
  disabled?: boolean; // 無効化プロパティ追加
  type?: string; // input type を追加
};

const Input = ({
  value,
  onChange,
  placeholder,
  id,
  label,
  disabled = false,
  type = "text",
}: Props) => (
  <div className="w-full">
    {label && (
      <label
        htmlFor={id}
        className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300"
      >
        {label}
      </label>
    )}
    <input
      id={id}
      className={cn(
        "border border-gray-300 dark:border-gray-600 rounded-sm px-2 py-1 w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors",
        disabled &&
          "opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-800",
      )}
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
    />
  </div>
);

export default Input;
