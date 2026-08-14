import React from 'react';
import { ArrowRight, Radio } from '../icons/motion';

type ListenRadioCtaProps = {
  onOpen: () => void;
};

/** Entry point to Radio Coran from the Écouter hub. */
export const ListenRadioCta: React.FC<ListenRadioCtaProps> = ({ onOpen }) => (
  <button
    type="button"
    onClick={onOpen}
    className="listen-radio-cta tap-feedback"
    aria-label="Radio Coran — stations en continu"
  >
    <span className="listen-radio-cta__sheen" aria-hidden />
    <span className="listen-radio-cta__icon" aria-hidden>
      <Radio className="h-4.5 w-4.5" />
    </span>
    <span className="listen-radio-cta__text">
      <span className="listen-radio-cta__title">Radio Coran</span>
      <span className="listen-radio-cta__meta">Stations en continu, sans choisir</span>
    </span>
    <ArrowRight className="listen-radio-cta__arrow h-4 w-4 shrink-0" aria-hidden />
  </button>
);
