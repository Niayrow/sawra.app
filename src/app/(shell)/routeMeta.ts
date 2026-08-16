import { resolveSeoForView } from '@/utils/seo';
import { seoDocToMetadata } from '@/utils/seoMetadata';

export const listenMetadata = seoDocToMetadata(resolveSeoForView('listen'));
export const libraryMetadata = seoDocToMetadata(resolveSeoForView('favorites'));
export const quizMetadata = seoDocToMetadata(resolveSeoForView('quiz'));
export const learnMetadata = seoDocToMetadata(resolveSeoForView('learn'));
export const radioMetadata = seoDocToMetadata(resolveSeoForView('radio'));
export const accountMetadata = seoDocToMetadata(resolveSeoForView('account'));
export const aboutMetadata = seoDocToMetadata(resolveSeoForView('more', 'about'));
export const compareMetadata = seoDocToMetadata(resolveSeoForView('more', 'compare'));
export const downloadsMetadata = seoDocToMetadata(resolveSeoForView('more', 'downloads'));
export const optionsMetadata = seoDocToMetadata(resolveSeoForView('more', 'priorities'));
