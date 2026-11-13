import { forwardRef } from "react";
import type { ComponentType, InputHTMLAttributes } from "react";

type IconType = ComponentType<
  React.SVGProps<SVGSVGElement> & { size?: number }
>;

interface InputWithIconProps extends InputHTMLAttributes<HTMLInputElement> {
  icon: IconType;
}

export const InputWithIcon = forwardRef<HTMLInputElement, InputWithIconProps>(
  ({ icon: Icon, className = "", ...props }, ref) => {
    return (
      <div className="relative">
        <Icon
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          size={18}
        />
        <input
          ref={ref}
          {...props}
          className={`w-full h-10 pl-10 pr-10 rounded-md border border-slate-300 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition ${className}`}
        />
      </div>
    );
  },
);

InputWithIcon.displayName = "InputWithIcon";
