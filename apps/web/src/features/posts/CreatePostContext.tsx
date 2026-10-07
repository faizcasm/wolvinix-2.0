import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

interface CreatePostContextValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  /** Optional prefill, e.g. quoting a post or starting with a hashtag. */
  seed: string;
  openWithSeed: (text: string) => void;
}

const CreatePostContext = createContext<CreatePostContextValue | null>(null);

export function CreatePostProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [seed, setSeed] = useState("");

  const value = useMemo<CreatePostContextValue>(
    () => ({
      isOpen,
      open: () => {
        setSeed("");
        setIsOpen(true);
      },
      openWithSeed: (text: string) => {
        setSeed(text);
        setIsOpen(true);
      },
      close: () => setIsOpen(false),
      seed,
    }),
    [isOpen, seed],
  );

  return <CreatePostContext.Provider value={value}>{children}</CreatePostContext.Provider>;
}

export function useCreatePost() {
  const context = useContext(CreatePostContext);
  if (!context) {
    throw new Error("useCreatePost must be used inside CreatePostProvider");
  }
  return context;
}
