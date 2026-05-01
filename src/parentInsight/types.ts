export type ParentInsight = {
  whatItIs: string;
  whyKidsCare: string;
  conversationStarters: string[];
  goodToKnow?: string;
};

export type ParentInsightSections = {
  whatItIsTitle: string;
  whyKidsCareTitle: string;
  conversationStartersTitle: string;
  goodToKnowTitle: string;
};

export const DEFAULT_SECTION_TITLES: ParentInsightSections = {
  whatItIsTitle: 'What it is',
  whyKidsCareTitle: 'Why kids care about it',
  conversationStartersTitle: 'Good questions to ask your child',
  goodToKnowTitle: 'Good to know',
};

