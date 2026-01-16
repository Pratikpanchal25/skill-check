import { toast, ExternalToast } from "sonner"
import { cn } from "@/lib/utils"

interface ShowToastProps {
    title: string
    description?: string
    className?: string
    type?: "default" | "success" | "warning" | "error" | "info"
    duration?: number
    action?: ExternalToast["action"]
}

const baseStyles =
    "rounded-xl border px-4 py-3 backdrop-blur-md shadow-lg text-sm"

const variants = {
    default:
        "bg-indigo-600/90 text-white border-indigo-400/30",
    success:
        "bg-teal-600/90 text-white border-teal-400/30",
    info:
        "bg-blue-600/90 text-white border-blue-400/30",
    warning:
        "bg-amber-500/90 text-white border-amber-400/30",
    error:
        "bg-rose-600/90 text-white border-rose-400/30",
}

export const showToast = ({
    title,
    description,
    className,
    type = "default",
    duration = 3500,
    action,
}: ShowToastProps) => {
    const toastOptions: ExternalToast = {
        description,
        duration,
        action,
        className: cn(
            baseStyles,
            variants[type],
            className
        ),
    }

    switch (type) {
        case "success":
            return toast.success(title, toastOptions)
        case "error":
            return toast.error(title, toastOptions)
        case "warning":
            return toast.warning(title, toastOptions)
        case "info":
            return toast.info(title, toastOptions)
        default:
            return toast(title, toastOptions)
    }
}
