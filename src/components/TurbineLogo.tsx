import { useRef, useEffect } from 'react';

interface TurbineLogoProps {
    className?: string;
}

export function TurbineLogo({ className = "" }: TurbineLogoProps) {
    return (
        <svg
            viewBox="0 0 512 512"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
        >
            {/* Tower (Static) */}
            <path
                d="M236 296V480C236 488.8 243.2 496 252 496H260C268.8 496 276 488.8 276 480V296C276 287.2 268.8 280 260 280H252C243.2 280 236 287.2 236 296Z"
                fill="currentColor"
            />

            {/* Blades (Spinning Group) */}
            <g className="origin-center animate-[spin_4s_linear_infinite]">
                {/* Hub */}
                <circle cx="256" cy="256" r="32" fill="currentColor" />

                {/* Top Blade */}
                <path
                    d="M240 224L256 32C264.8 32 272 39.2 272 48V224H240Z"
                    fill="currentColor"
                    transform="rotate(0 256 256)"
                />
                <path
                    d="M256 32C240 32 232 80 240 224H256V32Z"
                    fill="currentColor"
                    transform="rotate(0 256 256)"
                />

                {/* Right Blade */}
                <path
                    d="M278.6 267.3L445.1 363.4C452.7 367.8 455.3 377.6 450.9 385.2L446.9 392.1C442.5 399.7 432.7 402.3 425.1 397.9L278.6 313.3L278.6 267.3Z"
                    fill="currentColor"
                    transform="rotate(120 256 256)"
                />
                {/* Adjusted blade shapes for a cleaner look */}
                <path
                    d="M256 224L256 32C275 32 285 100 270 224H256Z"
                    fill="currentColor"
                />
                <path
                    d="M256 224L256 32C237 32 227 100 242 224H256Z"
                    fill="currentColor"
                />

                <path
                    d="M256 224L256 32C275 32 285 100 270 224H256Z"
                    fill="currentColor"
                    transform="rotate(120 256 256)"
                />
                <path
                    d="M256 224L256 32C237 32 227 100 242 224H256Z"
                    fill="currentColor"
                    transform="rotate(120 256 256)"
                />

                <path
                    d="M256 224L256 32C275 32 285 100 270 224H256Z"
                    fill="currentColor"
                    transform="rotate(240 256 256)"
                />
                <path
                    d="M256 224L256 32C237 32 227 100 242 224H256Z"
                    fill="currentColor"
                    transform="rotate(240 256 256)"
                />
            </g>
        </svg>
    );
}
