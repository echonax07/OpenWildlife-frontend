import { createContext, type FC, type ReactNode, useCallback, useContext, useState } from "react";
import * as ToastPrimitive from "@radix-ui/react-toast";
import styles from "./Toast.module.scss";
import clsx from "clsx";
import { IconCross } from "../../assets/icons";
import { nanoid } from "nanoid";

export type ToastViewportProps = ToastPrimitive.ToastViewportProps & any;
export interface ToastProps extends Omit<ToastPrimitive.ToastProps, "type"> {
  title?: string;
  action?: ReactNode;
  closeable?: boolean;
  open?: boolean;
  onClose?: () => void;
  type?: ToastType;
}

export enum ToastType {
  info = "info",
  error = "error",
  alertError = "alertError",
  success = "success",
}
interface ToastProviderWithTypes extends ToastPrimitive.ToastProviderProps {
  type: ToastType;
}
export const ToastViewport: FC<ToastViewportProps> = ({ hotkey, label, ...props }) => {
  return (
    <div className={styles["toast-viewport"]} {...props}>
      <ToastPrimitive.Viewport hotkey={hotkey} label={label} />
    </div>
  );
};

export const Toast: FC<ToastProps> = ({
  title,
  action,
  children,
  closeable = false,
  onClose,
  type = ToastType.info,
  ...props
}) => {
  const closeHandler = useCallback(
    (open: boolean) => {
      props.onOpenChange?.(open);
      if (!closeable) return;
      if (!open) onClose?.();
    },
    [closeable, onClose, props.onOpenChange],
  );

  return (
    <ToastPrimitive.Root {...props} onOpenChange={closeHandler}>
      <div
        className={clsx(styles.toast, {
          [styles.toast_info]: type === ToastType.info,
          [styles.toast_error]: type === ToastType.error,
          [styles.toast_alertError]: type === ToastType.alertError,
          [styles.toast_success]: type === ToastType.success,
        })}
      >
        {title && (
          <ToastPrimitive.Title>
            <div className={clsx(styles.toast__title)}>{title}</div>
          </ToastPrimitive.Title>
        )}
        <ToastPrimitive.Description>
          <div className={clsx(styles.toast__content)}>{children}</div>
        </ToastPrimitive.Description>
        {action}
        {closeable && (
          <ToastPrimitive.Close asChild>
            <div className={clsx(styles.toast__close)} aria-label="Close">
              <span aria-hidden>
                <IconCross />
              </span>
            </div>
          </ToastPrimitive.Close>
        )}
      </div>
    </ToastPrimitive.Root>
  );
};

export interface ToastActionProps extends ToastPrimitive.ToastActionProps {
  onClose?: () => void;
}
export const ToastAction: FC<ToastActionProps> = ({ children, onClose, altText, ...props }) => (
  <ToastPrimitive.Action altText={altText} asChild style={{ pointerEvents: "none" }}>
    <button className={styles.toast__action} onClick={onClose} style={{ pointerEvents: "all" }} {...props}>
      {children}
    </button>
  </ToastPrimitive.Action>
);
export type ToastShowArgs = {
  id?: string;
  message: string | ReactNode | JSX.Element;
  type?: ToastType;
  duration?: number; // -1 for no auto close
};
type ToastContextType = {
  show: ({ message, type, duration }: ToastShowArgs) => void;
};

export const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};

export const ToastProvider: FC<ToastProviderWithTypes> = ({ swipeDirection = "down", children, type, ...props }) => {
  const [toasts, setToasts] = useState<ToastShowArgs[]>([]);
  const defaultDuration = 2000;
  const duration = toasts[toasts.length-1]?.duration ?? defaultDuration;
  const show = ({ message, type, duration = defaultDuration }: ToastShowArgs) => {
    const id = nanoid();
    const newToast: ToastShowArgs = { id, message, type, duration };
    setToasts((prev) => [...prev, newToast]);

    if (duration >= 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
      }, duration);
    }
  };
  const toastType = toasts[toasts.length-1]?.type ?? type ?? ToastType.info;

  return (
    <ToastContext.Provider value={{ show }}>
      <ToastPrimitive.Provider swipeDirection={swipeDirection} duration={duration} {...props}>
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            open={true}
            onClose={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
            type={toast.type ?? ToastType.info}
            action={
              <ToastAction onClose={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))} altText="x">
                <IconCross />
              </ToastAction>
            }
            className={clsx(styles.messageToast, {
              [styles.messageToast_info]: toast.type === ToastType.info,
              [styles.messageToast_error]: toast.type === ToastType.error,
              [styles.messageToast_alertError]: toast.type === ToastType.alertError,
              [styles.messageToast_success]: toast.type === ToastType.success,
            })}
          >
            {toast.message}
          </Toast>
        ))}
        {children}
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
};
