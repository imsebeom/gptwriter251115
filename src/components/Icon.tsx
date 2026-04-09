type IconName =
  | 'logo'
  | 'write'
  | 'gallery'
  | 'admin'
  | 'topic'
  | 'genre'
  | 'ai'
  | 'save'
  | 'refresh'
  | 'heart'
  | 'comment'
  | 'plus'
  | 'key';

interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
  alt?: string;
}

export default function Icon({ name, size = 20, className = '', alt = '' }: IconProps) {
  return (
    <img
      src={`/icons/${name}.png`}
      width={size}
      height={size}
      alt={alt || name}
      className={`inline-block align-middle select-none ${className}`}
      draggable={false}
    />
  );
}
