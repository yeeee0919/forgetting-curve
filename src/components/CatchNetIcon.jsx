import catchNetUrl from '../assets/catch-net-icon.png'

/** Word Catcher 捕蟲網圖示（品牌素材） */
export default function CatchNetIcon({ size = 20, className = '' }) {
    return (
        <img
            src={catchNetUrl}
            alt=""
            width={size}
            height={size}
            className={`catch-net-icon ${className}`}
            style={{ width: size, height: size }}
            draggable={false}
            aria-hidden="true"
        />
    )
}
