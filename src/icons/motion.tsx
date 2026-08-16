'use client';

import { forwardRef, useEffect, useRef, type ComponentType } from 'react';
import {
  SearchIcon,
  HeartIcon,
  HeadphonesIcon,
  PlayIcon,
  PauseIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  ArrowLeftRightIcon,
  BookmarkIcon,
  DownloadIcon,
  ExternalLinkIcon,
  CloudIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  HistoryIcon,
  ShareIcon,
  SlidersHorizontalIcon,
  XIcon,
  SettingsIcon,
  SparklesIcon,
  CheckIcon,
  MoonIcon,
  MoonStarIcon,
  RepeatIcon,
  Repeat1Icon,
  ClockIcon,
  MonitorSmartphoneIcon,
  Volume2Icon,
  VolumeXIcon,
  SkipForwardIcon,
  SkipBackIcon,
  RefreshCwIcon,
  LogInIcon,
  LogOutIcon,
  WifiOffIcon,
  WifiIcon,
  CompassIcon,
  HardDriveIcon,
  ShieldCheckIcon,
  Trash2Icon,
  SmartphoneIcon,
  BookOpenIcon,
  BookOpenTextIcon,
  FileTextIcon,
  UserPlusIcon,
  MailIcon,
  LockIcon,
  UserIcon,
  EyeIcon,
  EyeOffIcon,
  GitCompareIcon,
  HouseIcon,
  AudioLinesIcon,
  RadioIcon,
  ShuffleIcon,
  PlusIcon,
  CopyIcon,
  Disc2Icon,
  MusicIcon,
  TriangleAlertIcon,
  LinkIcon,
  HardDriveDownloadIcon,
  FileCheckIcon,
  AudioWaveformIcon,
  ServerIcon,
  LayoutListIcon,
} from '@animateicons/react/lucide';

/** Icons not yet available in AnimateIcons — Lucide static fallback */
export {
  RotateCcw,
  RotateCw,
  Gauge,
  Maximize2,
  Minimize2,
  Landmark,
  Building2,
  Scale,
  AlertCircle,
} from 'lucide-react';

export type AppIconProps = {
  className?: string;
  size?: number | string;
  strokeWidth?: number | string;
  color?: string;
  duration?: number;
  isAnimated?: boolean;
  'aria-hidden'?: boolean | 'true' | 'false';
  'aria-label'?: string;
  title?: string;
};

export type AppIcon = ComponentType<AppIconProps>;

type AnimateIconHandle = {
  startAnimation: () => void;
  stopAnimation: () => void;
};

const PARENT_SELECTOR =
  'button, a, [role="button"], [role="tab"], [role="menuitem"], [role="link"], [role="option"], label, summary, [data-icon-animate]';

/** Bridge AnimateIcons props to Lucide-like AppIcon; animate on parent hover/touch. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function adapt(Icon: ComponentType<any>): AppIcon {
  const Adapted = forwardRef<unknown, AppIconProps>(function AdaptedIcon(
    { strokeWidth: _strokeWidth, size, color = 'currentColor', duration, className, ...rest },
    _ref,
  ) {
    const iconRef = useRef<AnimateIconHandle | null>(null);
    const hostRef = useRef<HTMLSpanElement | null>(null);

    useEffect(() => {
      const host = hostRef.current;
      if (!host) return;

      const interactive = host.closest(PARENT_SELECTOR) as HTMLElement | null;
      const parent = interactive ?? host.parentElement;
      if (
        !parent ||
        parent === document.body ||
        parent === document.documentElement
      ) {
        return;
      }

      const start = () => iconRef.current?.startAnimation();
      const stop = () => iconRef.current?.stopAnimation();

      parent.addEventListener('pointerenter', start);
      parent.addEventListener('pointerleave', stop);
      parent.addEventListener('focusin', start);
      parent.addEventListener('focusout', stop);

      return () => {
        parent.removeEventListener('pointerenter', start);
        parent.removeEventListener('pointerleave', stop);
        parent.removeEventListener('focusin', start);
        parent.removeEventListener('focusout', stop);
      };
    }, []);

    const numericSize =
      typeof size === 'number'
        ? size
        : typeof size === 'string' && /^\d+(\.\d+)?$/.test(size)
          ? Number(size)
          : undefined;

    return (
      <span ref={hostRef} style={{ display: 'contents' }}>
        <Icon
          ref={iconRef}
          size={numericSize}
          color={color}
          duration={duration ?? 1.2}
          className={className}
          {...rest}
        />
      </span>
    );
  });
  Adapted.displayName = (Icon as { displayName?: string }).displayName ?? 'AppIcon';
  return Adapted as AppIcon;
}

export const Search = adapt(SearchIcon);
export const Heart = adapt(HeartIcon);
export const Headphones = adapt(HeadphonesIcon);
export const Play = adapt(PlayIcon);
export const Pause = adapt(PauseIcon);
export const ArrowRight = adapt(ArrowRightIcon);
export const ArrowLeft = adapt(ArrowLeftIcon);
export const ArrowLeftRight = adapt(ArrowLeftRightIcon);
export const Bookmark = adapt(BookmarkIcon);
export const Download = adapt(DownloadIcon);
export const ExternalLink = adapt(ExternalLinkIcon);
export const Cloud = adapt(CloudIcon);
export const ChevronDown = adapt(ChevronDownIcon);
export const ChevronUp = adapt(ChevronUpIcon);
export const History = adapt(HistoryIcon);
export const Share = adapt(ShareIcon);
export const SlidersHorizontal = adapt(SlidersHorizontalIcon);
export const X = adapt(XIcon);
export const Settings = adapt(SettingsIcon);
export const Sparkles = adapt(SparklesIcon);
export const Check = adapt(CheckIcon);
export const Moon = adapt(MoonIcon);
export const MoonStar = adapt(MoonStarIcon);
export const Repeat = adapt(RepeatIcon);
export const Repeat1 = adapt(Repeat1Icon);
export const Clock = adapt(ClockIcon);
export const MonitorSmartphone = adapt(MonitorSmartphoneIcon);
export const Volume2 = adapt(Volume2Icon);
export const VolumeX = adapt(VolumeXIcon);
export const SkipForward = adapt(SkipForwardIcon);
export const SkipBack = adapt(SkipBackIcon);
export const RefreshCw = adapt(RefreshCwIcon);
export const LogIn = adapt(LogInIcon);
export const LogOut = adapt(LogOutIcon);
export const WifiOff = adapt(WifiOffIcon);
export const Wifi = adapt(WifiIcon);
export const Compass = adapt(CompassIcon);
export const HardDrive = adapt(HardDriveIcon);
export const ShieldCheck = adapt(ShieldCheckIcon);
export const Trash2 = adapt(Trash2Icon);
export const Smartphone = adapt(SmartphoneIcon);
export const BookOpen = adapt(BookOpenIcon);
export const BookOpenText = adapt(BookOpenTextIcon);
export const FileText = adapt(FileTextIcon);
export const UserPlus = adapt(UserPlusIcon);
export const Mail = adapt(MailIcon);
export const Lock = adapt(LockIcon);
export const User = adapt(UserIcon);
export const Eye = adapt(EyeIcon);
export const EyeOff = adapt(EyeOffIcon);
export const GitCompare = adapt(GitCompareIcon);
export const House = adapt(HouseIcon);
export const AudioLines = adapt(AudioLinesIcon);
export const Radio = adapt(RadioIcon);
export const Shuffle = adapt(ShuffleIcon);
export const Plus = adapt(PlusIcon);
export const Copy = adapt(CopyIcon);
export const Disc = adapt(Disc2Icon);
export const ListMusic = adapt(MusicIcon);
export const AlertTriangle = adapt(TriangleAlertIcon);
export const Link2 = adapt(LinkIcon);
export const CloudDownload = adapt(HardDriveDownloadIcon);
export const CloudCheck = adapt(FileCheckIcon);
export const Waves = adapt(AudioWaveformIcon);
export const Home = adapt(HouseIcon);
export const Shield = adapt(ShieldCheckIcon);
export const Database = adapt(ServerIcon);
export const SlidersVertical = adapt(LayoutListIcon);
