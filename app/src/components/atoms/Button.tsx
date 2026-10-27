// app/src/components/atoms/Button.tsx
import { cn } from "@/components/utils/cn";
import { UI_COLORS } from "@/components/utils/colors";
import LoadingSpinner from "./LoadingSpinner";

type Props = {
  label: string;
  onClick: () => void;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  "aria-expanded"?: boolean;
  "aria-controls"?: string;
  "aria-label"?: string;
  type?: "button" | "submit" | "reset";
};

const Button = ({
  label,
  onClick,
  variant = "primary",
  disabled = false,
  loading = false,
  className,
  "aria-expanded": ariaExpanded,
  "aria-controls": ariaControls,
  "aria-label": ariaLabel,
  type = "button",
}: Props) => {
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      className={cn(
        "block w-auto px-4 py-2 rounded-sm text-white transition-colors relative",
        "outline-offset-2 focus:outline-hidden",
        "focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-900",
        "focus-visible:outline-2 focus-visible:outline-blue-500",
        isDisabled && "opacity-60 cursor-not-allowed",
        variant === "primary" && `${UI_COLORS.blue.bg} ${UI_COLORS.blue.focus}`,
        variant === "secondary" &&
          "bg-gray-500 hover:bg-gray-600 focus-visible:ring-gray-400",
        variant === "danger" && `${UI_COLORS.red.bg} ${UI_COLORS.red.focus}`,
        className,
      )}
      aria-disabled={isDisabled || undefined}
      aria-expanded={ariaExpanded}
      aria-controls={ariaControls}
      aria-label={ariaLabel || (loading ? `${label}中...` : label)}
    >
      {loading && (
        <LoadingSpinner
          size="sm"
          className="absolute left-3 top-1/2 transform -translate-y-1/2"
          label=""
        />
      )}
      <span className={cn(loading && "ml-6")}>
        {loading ? `${label}中...` : label}
      </span>
    </button>
  );
};

export default Button;
