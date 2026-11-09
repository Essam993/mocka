import { FC, useId } from "react";

/** mocka mark: three rounded bars. Orange → orange-to-teal gradient → teal. Cropped tight to the artwork. */
export const IconLogo: FC<{ className?: string }> = ({ className }) => {
    const gid = useId().replace(/:/g, "");

    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 32 27"
            className={className}
            role="img"
            aria-label="mocka"
            fill="none"
        >
            <defs>
                <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#f27a4a" />
                    <stop offset="1" stopColor="#009e9b" />
                </linearGradient>
            </defs>

            {/* x, y, width, height, rx. Bars are 8 wide with 4 between them, the tallest touches the top and all touch the bottom */}
            <rect x="0" y="15" width="8" height="12" rx="4" fill="#f27a4a" />
            <rect x="12" y="7" width="8" height="20" rx="4" fill={`url(#${gid})`} />
            <rect x="24" y="0" width="8" height="27" rx="4" fill="#009e9b" />
        </svg>
    );
};