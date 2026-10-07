import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Home, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";

/** 404 — with a little personality. */
export function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, rotate: -6 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 16 }}
        className="relative"
      >
        <span className="font-display text-gradient text-[7rem] leading-none font-bold sm:text-[10rem]">
          404
        </span>
        <span className="animate-float absolute top-2 -right-4 text-4xl" aria-hidden="true">
          🐺
        </span>
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12 }}
        className="font-display mt-2 text-2xl font-bold"
      >
        This pack wandered off the map
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-muted mt-3 max-w-sm text-sm"
      >
        The page you're looking for doesn't exist, was moved, or is still being built. Let's get you
        back to the fight.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.28 }}
        className="mt-7 flex flex-wrap justify-center gap-3"
      >
        <Button leftIcon={<Home className="h-4 w-4" />} onClick={() => navigate("/")}>
          Back to feed
        </Button>
        <Button
          variant="outline"
          leftIcon={<ArrowLeft className="h-4 w-4" />}
          onClick={() => window.history.back()}
        >
          Go back
        </Button>
      </motion.div>
    </div>
  );
}

export default NotFound;
