import * as React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { Loader2 } from "lucide-react";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | "default"
    | "secondary"
    | "outline"
    | "ghost"
    | "destructive"
    | "link";
  size?: "sm" | "md" | "lg" | "icon";
  isLoading?: boolean;
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "default",
      size = "md",
      isLoading = false,
      asChild = false,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:opacity-50 disabled:pointer-events-none rounded-md border text-sm select-none";

    const variantStyles = {
      default:
        "bg-primary text-primary-foreground border-transparent hover:bg-primary/90 shadow-sm",
      secondary:
        "bg-secondary text-secondary-foreground border-border/40 hover:bg-secondary/80",
      outline:
        "bg-transparent text-foreground border-border hover:bg-muted/60",
      ghost:
        "bg-transparent text-foreground border-transparent hover:bg-muted/60",
      destructive:
        "bg-destructive text-destructive-foreground border-transparent hover:bg-destructive/90 shadow-sm",
      link: "bg-transparent text-primary border-transparent underline-offset-4 hover:underline p-0 h-auto",
    };

    const sizeStyles = {
      sm: "h-8 px-3 text-xs",
      md: "h-9 px-4 text-sm",
      lg: "h-11 px-6 text-base",
      icon: "h-9 w-9 p-0",
    };

    const combinedClassName = cn(
      baseStyles,
      variantStyles[variant],
      sizeStyles[size],
      className
    );

    if (asChild && React.isValidElement(children)) {
      const child = children as React.ReactElement<any>;
      return React.cloneElement(child, {
        className: cn(combinedClassName, child.props.className),
        ...props,
      });
    }

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={combinedClassName}
        {...props}
      >
        {isLoading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
