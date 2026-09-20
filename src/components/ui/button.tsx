"use client"

import { forwardRef, type ReactNode } from "react"
import { cn } from "@/lib/utils"

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger"
type ButtonSize = "sm" | "md" | "lg"

interface ButtonProps {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  disabled?: boolean
  className?: string
  children?: ReactNode
  onClick?: () => void
  type?: "button" | "submit" | "reset"
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: "btn btn-fill",
  secondary: "btn",
  ghost: "btn btn-ghost",
  danger: "btn btn-danger",
}

const sizeStyles: Record<ButtonSize, string> = {
  sm: "btn-sm",
  md: "",
  lg: "btn-lg",
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      loading,
      disabled,
      children,
      type = "button",
      onClick,
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(variantStyles[variant], sizeStyles[size], className)}
        disabled={disabled || loading}
        onClick={onClick}
      >
        {loading && (
          <span
            className="spin-ring h-4 w-4 shrink-0 animate-spin border-2 border-current border-t-transparent"
            aria-hidden="true"
          />
        )}
        {children}
      </button>
    )
  }
)

Button.displayName = "Button"
