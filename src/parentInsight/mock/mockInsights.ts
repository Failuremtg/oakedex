import type { ParentInsight } from '@/src/parentInsight/types';

export type MockInsightEntry = {
  id: 'roblox' | 'shiny_pokemon' | 'skins';
  matchers: string[];
  examplePrompt: string;
  insight: ParentInsight;
};

export const MOCK_INSIGHTS: MockInsightEntry[] = [
  {
    id: 'roblox',
    matchers: ['roblox', 'robux', 'obby', 'adopt me', 'brookhaven'],
    examplePrompt: 'What is Roblox?',
    insight: {
      whatItIs:
        "Roblox is an app where kids can play lots of user‑made games and also build their own. It’s more like a huge playground of mini‑games than one single game.",
      whyKidsCare:
        'It’s social and creative. Kids can play with friends, show off what they built, and feel “in the know” about popular games inside Roblox.',
      conversationStarters: [
        'What are your favorite games in Roblox right now—and what do you like about them?',
        'Do you mostly play with friends, or meet new people in games?',
        'Have you ever built something in Roblox? Want to show me?',
        'If you could change one thing about Roblox, what would it be?',
      ],
      goodToKnow:
        'Roblox has in‑app spending (Robux) and social features like chat. It can help to talk about spending rules, privacy (real names), and what to do if someone is mean or asks for personal info.',
    },
  },
  {
    id: 'shiny_pokemon',
    matchers: ['shiny', 'shiny pokemon', 'shiny pokémon', 'shiny hunting', 'sparkly pokemon'],
    examplePrompt: 'What does shiny Pokémon mean?',
    insight: {
      whatItIs:
        'A “shiny” Pokémon is a rare version of a Pokémon with different colors. It plays the same—it just looks special and is hard to find.',
      whyKidsCare:
        'It feels exciting and meaningful to get something rare. Kids may enjoy the “hunt,” the bragging rights, and showing it to friends.',
      conversationStarters: [
        'Which shiny are you hoping to find, and why that one?',
        'How do you try to get shinies—do you have a routine or strategy?',
        'What’s the coolest shiny you’ve seen from a friend or online?',
        'Do you like collecting, battling, or just exploring more?',
      ],
      goodToKnow:
        'Some games make shinies take a lot of time to find, which can turn into long sessions. If your child plays online, you can also ask where they learned tips—friends, YouTube, or guides.',
    },
  },
  {
    id: 'skins',
    matchers: ['skin', 'skins', 'cosmetic', 'outfit', 'emote', 'pickaxe'],
    examplePrompt: 'What is a skin in games?',
    insight: {
      whatItIs:
        'A “skin” is a cosmetic look for a character or item in a game—like an outfit. It usually doesn’t make the player stronger; it changes how things look.',
      whyKidsCare:
        'Skins can be about identity and belonging. Kids use them to express style, match friends, or show they earned (or bought) something rare.',
      conversationStarters: [
        'What skin do you like the most, and what does it say about you?',
        'Do you choose skins based on style, rarity, or what your friends use?',
        'Is there a skin you earned that you’re proud of?',
        'Do you ever feel pressure to have certain skins to fit in?',
      ],
      goodToKnow:
        'Skins are often tied to spending or limited-time offers. It can help to set clear rules about purchases, “impulse buys,” and what to do when friends are talking about buying things.',
    },
  },
];

