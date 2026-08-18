import type { SVGProps } from 'react'

function createIcon(paths: React.ReactNode) {
    return function Icon({ className, ...props }: SVGProps<SVGSVGElement>) {
        return (
            <svg
                xmlns='http://www.w3.org/2000/svg'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth={2}
                strokeLinecap='round'
                strokeLinejoin='round'
                className={className}
                aria-hidden='true'
                {...props}
            >
                {paths}
            </svg>
        )
    }
}

export const DashboardIcon = createIcon(
    <>
        <rect x='3' y='3' width='7' height='9' rx='1' />
        <rect x='14' y='3' width='7' height='5' rx='1' />
        <rect x='14' y='12' width='7' height='9' rx='1' />
        <rect x='3' y='16' width='7' height='5' rx='1' />
    </>,
)

export const RoomsIcon = createIcon(
    <>
        <path d='M3 21h18' />
        <path d='M6 21v-8a6 6 0 0 1 12 0v8' />
        <path d='M6 13H4a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h2' />
        <path d='M18 13h2a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-2' />
    </>,
)

export const CalendarIcon = createIcon(
    <>
        <rect x='3' y='4' width='18' height='18' rx='2' />
        <path d='M16 2v4M8 2v4M3 10h18' />
    </>,
)

export const ClockIcon = createIcon(
    <>
        <circle cx='12' cy='12' r='10' />
        <path d='M12 6v6l4 2' />
    </>,
)

export const StarIcon = createIcon(
    <path d='M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z' />,
)

export const ChartIcon = createIcon(
    <>
        <path d='M3 3v16a2 2 0 0 0 2 2h16' />
        <path d='M7 13v4M11 9v8M15 5v12M19 9v8' />
    </>,
)

export const LogOutIcon = createIcon(
    <>
        <path d='M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4' />
        <path d='M16 17l5-5-5-5M21 12H9' />
    </>,
)

export const MenuIcon = createIcon(
    <>
        <path d='M4 6h16M4 12h16M4 18h16' />
    </>,
)

export const CheckIcon = createIcon(<path d='M20 6 9 17l-5-5' />)

export const AlertIcon = createIcon(
    <>
        <circle cx='12' cy='12' r='10' />
        <path d='M12 8v4M12 16h.01' />
    </>,
)

export const PlusIcon = createIcon(
    <>
        <path d='M12 5v14M5 12h14' />
    </>,
)

export const XIcon = createIcon(<path d='M18 6 6 18M6 6l12 12' />)

export const DownloadIcon = createIcon(
    <>
        <path d='M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4' />
        <path d='M7 10l5 5 5-5' />
        <path d='M12 15V3' />
    </>,
)

export const ChevronLeftIcon = createIcon(<path d='M15 18l-6-6 6-6' />)

export const ChevronRightIcon = createIcon(<path d='M9 18l6-6-6-6' />)

export const TrashIcon = createIcon(
    <>
        <path d='M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2' />
        <path d='M10 11v6M14 11v6' />
    </>,
)

export const UsersIcon = createIcon(
    <>
        <path d='M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2' />
        <circle cx='9' cy='7' r='4' />
        <path d='M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75' />
    </>,
)

export const MapPinIcon = createIcon(
    <>
        <path d='M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z' />
        <circle cx='12' cy='10' r='3' />
    </>,
)

export const TriangleIcon = createIcon(
    <>
        <path d='M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z' />
    </>,
)
