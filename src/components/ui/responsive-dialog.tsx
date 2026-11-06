import * as React from 'react';
import { X } from 'lucide-react';
import { DialogTitle as RadixTitle } from '@radix-ui/react-dialog';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { hapticSelectionChanged } from '@/lib/haptics';
import { cn } from '@/lib/utils';

/**
 * Dialog on desktop (≥768), vaul bottom sheet on phones (motion spec §2.3).
 * A one-line import swap at each call site: same component names/props as
 * ui/dialog, plus `detents` on the root.
 *
 * - detents="content" (default): sheet sizes to its content.
 * - detents="tall": snaps at 55% and 92% of the screen; selectionChanged
 *   haptic on a detent snap (never on open); content scrolls only at the top detent.
 * - Drag down >25% or flick to dismiss; Esc, backdrop tap and the 44pt X still close.
 *
 * Not for destructive confirms (keep AlertDialog) or the consent sheet
 * (non-modal, never drag-dismissable; see ConsentSheet).
 */

const MOBILE_QUERY = '(max-width: 767px)';

function subscribe(cb: () => void) {
  const mql = window.matchMedia?.(MOBILE_QUERY);
  mql?.addEventListener('change', cb);
  return () => mql?.removeEventListener('change', cb);
}

export function useIsSheetLayout(): boolean {
  return React.useSyncExternalStore(
    subscribe,
    () => !!window.matchMedia?.(MOBILE_QUERY).matches,
    () => false,
  );
}

export const TALL_DETENTS = [0.55, 0.92];

const Ctx = React.createContext<{ sheet: boolean; tall?: boolean }>({ sheet: false });

type RootProps = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultOpen?: boolean;
  children: React.ReactNode;
  detents?: 'content' | 'tall';
};

export function ResponsiveDialog({ detents = 'content', children, ...props }: RootProps) {
  const sheet = useIsSheetLayout();
  const [snap, setSnap] = React.useState<number | string | null>(TALL_DETENTS[0]);
  const lastSnap = React.useRef<number | string | null>(TALL_DETENTS[0]);

  const { open, onOpenChange } = props;
  // vaul doesn't hand focus back to the trigger when a sheet closes (it stays
  // on the closing sheet), so remember what opened it and restore it ourselves.
  const returnFocusTo = React.useRef<HTMLElement | null>(null);
  React.useLayoutEffect(() => {
    if (!sheet) return;
    if (open) {
      const active = document.activeElement;
      if (active instanceof HTMLElement && active !== document.body) returnFocusTo.current = active;
    } else if (returnFocusTo.current) {
      const target = returnFocusTo.current;
      returnFocusTo.current = null;
      requestAnimationFrame(() => {
        if (target.isConnected) target.focus({ preventScroll: true });
      });
    }
  }, [open, sheet]);
  React.useEffect(() => {
    if (open === false) {
      setSnap(TALL_DETENTS[0]);
      lastSnap.current = TALL_DETENTS[0];
    }
  }, [open]);

  const onSnap = React.useCallback((p: number | string | null) => {
    setSnap(p);
    if (p !== null && p !== lastSnap.current) void hapticSelectionChanged();
    lastSnap.current = p;
  }, []);

  // vaul's snap-point release only closes on a fast flick shorter than 40% of the
  // screen, and never on a slow drag. Spec: also close when dragged >25% of the
  // lowest detent's height below it.
  const dragStartY = React.useRef<number | null>(null);
  const onDrag = React.useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (dragStartY.current === null) dragStartY.current = e.pageY;
  }, []);
  const onRelease = React.useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const start = dragStartY.current;
      dragStartY.current = null;
      if (start === null || lastSnap.current !== TALL_DETENTS[0]) return;
      const lowestHeight = TALL_DETENTS[0] * window.innerHeight;
      if (e.pageY - start > lowestHeight * 0.25) onOpenChange?.(false);
    },
    [onOpenChange],
  );

  if (!sheet) {
    return (
      <Ctx.Provider value={{ sheet: false }}>
        <Dialog {...props}>{children}</Dialog>
      </Ctx.Provider>
    );
  }

  return (
    <Ctx.Provider value={{ sheet: true, tall: detents === 'tall' }}>
      {detents === 'tall' ? (
        <Drawer
          {...props}
          onOpenChange={onOpenChange}
          closeThreshold={0.25}
          snapPoints={TALL_DETENTS}
          activeSnapPoint={snap}
          setActiveSnapPoint={onSnap}
          fadeFromIndex={0}
          onDrag={onDrag}
          onRelease={onRelease}
        >
          {children}
        </Drawer>
      ) : (
        <Drawer {...props} onOpenChange={onOpenChange} closeThreshold={0.25}>
          {children}
        </Drawer>
      )}
    </Ctx.Provider>
  );
}

export const ResponsiveDialogTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof DialogTrigger>
>((props, ref) => {
  const { sheet } = React.useContext(Ctx);
  return sheet ? <DrawerTrigger ref={ref} {...props} /> : <DialogTrigger ref={ref} {...props} />;
});
ResponsiveDialogTrigger.displayName = 'ResponsiveDialogTrigger';

export const ResponsiveDialogClose = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof DialogClose>
>((props, ref) => {
  const { sheet } = React.useContext(Ctx);
  return sheet ? <DrawerClose ref={ref} {...props} /> : <DialogClose ref={ref} {...props} />;
});
ResponsiveDialogClose.displayName = 'ResponsiveDialogClose';

/** Desktop-dialog-only layout classes that must not leak onto the sheet. */
const DIALOG_ONLY = /^(?:sm:|md:|lg:)?(?:w-|max-w-|max-h-|top-|left-|translate-|rounded|p-0$)/;

export const ResponsiveDialogContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof DialogContent> & { sheetClassName?: string }
>(({ className, sheetClassName, children, ...props }, ref) => {
  const { sheet, tall } = React.useContext(Ctx);
  if (!sheet) {
    return (
      <DialogContent ref={ref} className={className} {...props}>
        {children}
      </DialogContent>
    );
  }
  const kept = (className ?? '')
    .split(/\s+/)
    .filter((c) => c && !DIALOG_ONLY.test(c))
    .join(' ');
  return (
    <DrawerContent
      ref={ref}
      // Fit the top detent above the off-screen base. Vaul translates
      // the paper by (1 - snap) * viewport height: removing that inset from both
      // edges keeps the bottom reachable at 92% (BH-121).
      className={cn(kept, tall && 'top-[8dvh] bottom-[8dvh] h-auto', sheetClassName)}
      data-testid="responsive-sheet"
      {...(props as React.ComponentPropsWithoutRef<typeof DrawerContent>)}
      // Focus the sheet itself, not its first input: no keyboard popping over a
      // half-height sheet, and a focused input stops vaul's drag-to-dismiss.
      onOpenAutoFocus={(e: Event) => {
        props.onOpenAutoFocus?.(e);
        if (e.defaultPrevented) return;
        e.preventDefault();
        (e.currentTarget as HTMLElement | null)?.focus();
      }}
    >
      <DrawerClose
        className="absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground opacity-80 hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Close"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </DrawerClose>
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain px-4 pt-2 pb-4">
        {children}
      </div>
    </DrawerContent>
  );
});
ResponsiveDialogContent.displayName = 'ResponsiveDialogContent';

export function ResponsiveDialogHeader(props: React.HTMLAttributes<HTMLDivElement>) {
  const { sheet } = React.useContext(Ctx);
  return sheet ? (
    <DrawerHeader {...props} className={cn('px-0 pt-0 pr-12', props.className)} />
  ) : (
    <DialogHeader {...props} />
  );
}

export function ResponsiveDialogFooter(props: React.HTMLAttributes<HTMLDivElement>) {
  const { sheet } = React.useContext(Ctx);
  return sheet ? (
    <DrawerFooter {...props} className={cn('px-0 pb-0', props.className)} />
  ) : (
    <DialogFooter {...props} />
  );
}

export const ResponsiveDialogTitle = React.forwardRef<
  HTMLHeadingElement,
  React.ComponentPropsWithoutRef<typeof RadixTitle>
>((props, ref) => {
  const { sheet } = React.useContext(Ctx);
  return sheet ? <DrawerTitle ref={ref} {...props} /> : <DialogTitle ref={ref} {...props} />;
});
ResponsiveDialogTitle.displayName = 'ResponsiveDialogTitle';

export const ResponsiveDialogDescription = React.forwardRef<
  HTMLParagraphElement,
  React.ComponentPropsWithoutRef<typeof DialogDescription>
>((props, ref) => {
  const { sheet } = React.useContext(Ctx);
  return sheet ? (
    <DrawerDescription ref={ref} {...props} />
  ) : (
    <DialogDescription ref={ref} {...props} />
  );
});
ResponsiveDialogDescription.displayName = 'ResponsiveDialogDescription';
