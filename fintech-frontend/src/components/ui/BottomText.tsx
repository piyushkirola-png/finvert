import { motion } from "framer-motion";

interface BottomTextProps {
  text: string;
  linkText: string;
  onLinkClick: () => void;
  delay: number;
}

export default function BottomText({
  text,
  linkText,
  onLinkClick,
  delay,
}: BottomTextProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay }}
      className="mt-8 text-center text-slate-500 text-sm"
    >
      {text}{" "}
      <button
        type="button"
        className="text-blue-600 font-medium cursor-pointer hover:text-blue-700 bg-transparent border-none p-0"
        onClick={onLinkClick}
      >
        {linkText}
      </button>
    </motion.div>
  );
}
