import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Reset scroll on route change. Uses instant jump so it does not fight the
 * page slide (smooth scroll + exit animation feels like the page is dragging).
 */
export default function ScrollToTop() {
    const { pathname } = useLocation();

    useEffect(() => {
        window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }, [pathname]);

    return null;
}
