import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-inverse-surface group-[.toaster]:text-inverse-on-surface group-[.toaster]:rounded-xl group-[.toaster]:shadow-ambient-md group-[.toaster]:border-l-[3px] group-[.toaster]:font-body",
          description: "group-[.toast]:text-inverse-on-surface/60 group-[.toast]:text-xs",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-on-primary",
          cancelButton: "group-[.toast]:bg-surface-container-highest group-[.toast]:text-on-surface-variant",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
