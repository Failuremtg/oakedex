import { useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/Themed';
import { charcoal, primary } from '@/constants/Colors';
import { hapticLight } from '@/src/lib/haptics';
import { setOnboardingSeen } from '@/src/lib/onboardingStorage';
import { BinderCover } from '@/components/BinderCover';
import { BINDER_COLOR_OPTIONS, getBinderColorHex } from '@/src/constants/binderColors';
import { CachedImage } from '@/components/CachedImage';
import type { CardVariant } from '@/src/types';
import { getPokemonSpriteUrl } from '@/src/constants/collectionIcons';

type Slide = {
  key: string;
  title: string;
  body: string;
};

const SLIDES: Slide[] = [
  {
    key: 'welcome',
    title: 'Welcome to Oakedex',
    body:
      "This quick onboarding helps you understand how Oakedex works so you can start collecting right away.\n\nWe'll walk through creating binders, choosing binder types, adding cards (including versions like holo/reverse), using Card Dex search, and organizing Wanted lists.\n\nYou can skip anytime — and you’ll still be able to learn these features later as you use the app.",
  },
  {
    key: 'binders',
    title: 'Create binders',
    body:
      "Binders are how you organize your collection in Oakedex.\n\nTry the mini demo below — it won’t create a real binder yet, but it shows the exact choices you’ll make in the app.",
  },
  {
    key: 'types',
    title: 'More on binder types',
    body:
      "Each binder type is built for a different collecting goal.\n\nUse the mini demo below to compare types and see what changes.",
  },
  {
    key: 'add-cards',
    title: 'Add cards',
    body:
      "Collecting is simple: tap a card to collect/uncollect it.\n\nSome cards have versions (normal / holo / reverse). Use the version picker to select the one you own.",
  },
  {
    key: 'card-dex',
    title: 'Card Dex',
    body: 'Search cards by name or by set + number (e.g. “base1 4”). View prices and details quickly.',
  },
  {
    key: 'wanted',
    title: 'Wanted lists',
    body: 'Track cards you want to buy or trade for. Create multiple lists (trade binder, buy list, etc.).',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const [demoBinderName, setDemoBinderName] = useState('My first binder');
  const [demoBinderType, setDemoBinderType] = useState<
    'master_set' | 'single_pokemon' | 'by_set' | 'custom'
  >('master_set');
  const [demoBinderColorId, setDemoBinderColorId] = useState<string>(BINDER_COLOR_OPTIONS[0]?.id ?? 'normal');
  const [demoSetCollected, setDemoSetCollected] = useState<Set<string>>(new Set());
  const [demoMasterCollected, setDemoMasterCollected] = useState<Record<string, CardVariant | null>>({});
  const [demoPickerOpen, setDemoPickerOpen] = useState<null | { slotKey: string }>(null);
  const [dexLang, setDexLang] = useState<'en' | 'fr' | 'de' | 'es'>('en');
  const [dexQuery, setDexQuery] = useState('');
  const [wantedListName, setWantedListName] = useState('Trade binder');
  const [wantedItems, setWantedItems] = useState<
    Array<{
      id: string;
      name: string;
      setName: string;
      localId: string;
      image: string;
      intent: 'buy' | 'trade' | 'either';
      variant: 'normal' | 'holo' | 'reverse';
      note?: string;
    }>
  >([
    {
      id: 'w1',
      name: 'Pikachu',
      setName: 'Base Set',
      localId: '58',
      image: 'https://images.pokemontcg.io/base1/58.png',
      intent: 'trade',
      variant: 'normal',
      note: 'NM if possible',
    },
    {
      id: 'w2',
      name: 'Charizard',
      setName: 'Base Set',
      localId: '4',
      image: 'https://images.pokemontcg.io/base1/4.png',
      intent: 'either',
      variant: 'holo',
    },
  ]);

  const isLast = index >= SLIDES.length - 1;
  const dots = useMemo(() => SLIDES.map((s) => s.key), []);
  const slide = SLIDES[index] ?? SLIDES[0]!;

  const demoSetCards = useMemo(() => {
    // Small selection of real card images (public URLs) for demo purposes.
    // Mirrors "By Set" binder behavior (lit up when collected, grey overlay when not).
    return [
      {
        slotKey: 'base1/58',
        name: 'Pikachu',
        variants: {
          normal: 'https://images.pokemontcg.io/base1/58.png',
          holo: 'https://images.pokemontcg.io/base1/58.png',
          reverse: 'https://images.pokemontcg.io/base1/58.png',
        } as Record<'normal' | 'holo' | 'reverse', string>,
        hasVersions: true,
      },
      { slotKey: 'base1/44', name: 'Bulbasaur', uri: 'https://images.pokemontcg.io/base1/44.png' },
      { slotKey: 'base1/46', name: 'Charmander', uri: 'https://images.pokemontcg.io/base1/46.png' },
    ] as const;
  }, []);

  const demoMasterSlots = useMemo(() => {
    // Mirrors Master Set binder behavior: sprite silhouette when missing, card image when collected.
    return [
      { slotKey: 'dex:25', name: 'Pikachu', dexId: 25, versions: demoSetCards[0]!.variants },
      { slotKey: 'dex:1', name: 'Bulbasaur', dexId: 1, versions: { normal: demoSetCards[1]!.uri } as any },
      { slotKey: 'dex:4', name: 'Charmander', dexId: 4, versions: { normal: demoSetCards[2]!.uri } as any },
    ] as const;
  }, [demoSetCards]);

  const toggleSetCard = useCallback((k: string) => {
    hapticLight();
    setDemoSetCollected((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  }, []);

  const setMasterSlotVariant = useCallback((slotKey: string, variant: CardVariant | null) => {
    setDemoMasterCollected((prev) => ({ ...prev, [slotKey]: variant }));
  }, []);

  const clearMasterSlot = useCallback((slotKey: string) => {
    setDemoMasterCollected((prev) => ({ ...prev, [slotKey]: null }));
  }, []);

  const pickerSlot = useMemo(() => {
    if (!demoPickerOpen?.slotKey) return null;
    return demoMasterSlots.find((s) => s.slotKey === demoPickerOpen.slotKey) ?? null;
  }, [demoPickerOpen?.slotKey, demoMasterSlots]);

  const pickerOptions = useMemo(() => {
    if (!pickerSlot) return [];
    const versions = pickerSlot.versions as Partial<Record<CardVariant, string>>;
    const opts: Array<{ v: CardVariant; uri: string }> = [];
    // Prefer showing normal/holo/reverse in that order if present
    for (const v of ['normal', 'holo', 'reverse'] as CardVariant[]) {
      const uri = versions[v];
      if (uri) opts.push({ v, uri });
    }
    // Fallback: if only normal is present, ensure at least that shows
    if (opts.length === 0 && versions.normal) opts.push({ v: 'normal', uri: versions.normal });
    return opts;
  }, [pickerSlot]);

  type DexDemoCard = {
    id: string;
    name: string;
    lang: 'en' | 'fr' | 'de' | 'es';
    setId: string;
    setName: string;
    localId: string;
    image: string;
  };

  const dexCards: DexDemoCard[] = useMemo(
    () => [
      // Keep this tiny: a few cards per Pokémon.
      {
        id: 'base1-58-en',
        name: 'Pikachu',
        lang: 'en',
        setId: 'base1',
        setName: 'Base Set',
        localId: '58',
        image: 'https://images.pokemontcg.io/base1/58.png',
      },
      {
        id: 'base1-58-fr',
        name: 'Pikachu',
        lang: 'fr',
        setId: 'base1',
        setName: 'Set de Base',
        localId: '58',
        image: 'https://images.pokemontcg.io/base1/58.png',
      },
      {
        id: 'base1-44-en',
        name: 'Bulbasaur',
        lang: 'en',
        setId: 'base1',
        setName: 'Base Set',
        localId: '44',
        image: 'https://images.pokemontcg.io/base1/44.png',
      },
      {
        id: 'base1-46-en',
        name: 'Charmander',
        lang: 'en',
        setId: 'base1',
        setName: 'Base Set',
        localId: '46',
        image: 'https://images.pokemontcg.io/base1/46.png',
      },
      {
        id: 'base1-4-en',
        name: 'Charizard',
        lang: 'en',
        setId: 'base1',
        setName: 'Base Set',
        localId: '4',
        image: 'https://images.pokemontcg.io/base1/4.png',
      },
      {
        id: 'base1-7-en',
        name: 'Blastoise',
        lang: 'en',
        setId: 'base1',
        setName: 'Base Set',
        localId: '2',
        image: 'https://images.pokemontcg.io/base1/2.png',
      },
      {
        id: 'base1-15-en',
        name: 'Venusaur',
        lang: 'en',
        setId: 'base1',
        setName: 'Base Set',
        localId: '15',
        image: 'https://images.pokemontcg.io/base1/15.png',
      },
      {
        id: 'base1-23-en',
        name: 'Arcanine',
        lang: 'en',
        setId: 'base1',
        setName: 'Base Set',
        localId: '23',
        image: 'https://images.pokemontcg.io/base1/23.png',
      },
      {
        id: 'base1-32-en',
        name: 'Nidoran ♀',
        lang: 'en',
        setId: 'base1',
        setName: 'Base Set',
        localId: '57',
        image: 'https://images.pokemontcg.io/base1/57.png',
      },
    ],
    []
  );

  const dexFiltered = useMemo(() => {
    const q = dexQuery.trim().toLowerCase();
    const inLang = dexCards.filter((c) => c.lang === dexLang);
    if (!q) return inLang.slice(0, 8);

    // Supports:
    // - name contains
    // - "base1 4" or "base1-4" or "base1/4"
    const setNumMatch = q.match(/^([a-z0-9]+)\s*[-/ ]\s*([0-9]+)$/i);
    if (setNumMatch) {
      const setId = setNumMatch[1] ?? '';
      const num = setNumMatch[2] ?? '';
      const exact = inLang.filter((c) => c.setId.toLowerCase() === setId.toLowerCase() && c.localId === num);
      if (exact.length) return exact;
    }

    const nameHits = inLang.filter((c) => c.name.toLowerCase().includes(q));
    return nameHits.slice(0, 10);
  }, [dexCards, dexLang, dexQuery]);

  const addWantedDemoItem = useCallback(() => {
    hapticLight();
    const id = `w-${Date.now()}`;
    const next = {
      id,
      name: 'Bulbasaur',
      setName: 'Base Set',
      localId: '44',
      image: 'https://images.pokemontcg.io/base1/44.png',
      intent: 'buy' as const,
      variant: 'reverse' as const,
      note: 'Any condition',
    };
    setWantedItems((prev) => [next, ...prev].slice(0, 6));
  }, []);

  const removeWantedDemoItem = useCallback((id: string) => {
    hapticLight();
    setWantedItems((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const binderExplain = useMemo(() => {
    switch (demoBinderType) {
      case 'master_set':
        return {
          title: 'Master Set binder',
          sections: [
            {
              h: 'What it tracks',
              t: 'Completion tracking for a Pokémon list. Each slot represents a Pokémon/form entry — collected or missing.',
            },
            {
              h: 'How you collect',
              t: 'Open the binder in Edit mode, tap a slot, then pick the exact card/version you own.',
            },
            {
              h: 'Why versions matter',
              t: 'If a Pokémon has multiple versions (or special forms like Mega/VMAX entries), they count separately so your completion stays accurate.',
            },
          ],
        };
      case 'single_pokemon':
        return {
          title: 'Single Pokémon binder',
          sections: [
            {
              h: 'What it tracks',
              t: 'Every printing for one Pokémon (often across many sets). Great for “collect all Charizard cards” goals.',
            },
            {
              h: 'How you collect',
              t: 'In Edit mode you can collect/uncollect specific printings. You can also add your own missing cards and upload images.',
            },
            {
              h: 'Variants & languages',
              t: 'Cards can have variants (normal/holo/reverse/etc). Some binders also track multiple languages for the same printing.',
            },
          ],
        };
      case 'by_set':
        return {
          title: 'By Set binder',
          sections: [
            {
              h: 'What it tracks',
              t: 'A checklist for one specific set. Each card/variant in the set can be collected individually.',
            },
            {
              h: 'How you collect',
              t: 'In Edit mode, tap a card to collect it. If the card has multiple variants (normal/holo/reverse), you can switch versions.',
            },
            {
              h: 'Why it’s useful',
              t: 'Perfect for set completion — you can see progress at a glance and quickly find what you’re missing.',
            },
          ],
        };
      case 'custom':
        return {
          title: 'Custom binder',
          sections: [
            {
              h: 'What it is',
              t: 'Build your own binder layout. Add whatever cards you want — great for trade binders, theme binders, or personal collections.',
            },
            {
              h: 'How you add cards',
              t: 'In Edit mode you can add missing cards manually (and upload your own images). You can also delete cards anytime.',
            },
            {
              h: 'When to use it',
              t: 'Use custom when you don’t want a fixed checklist — you just want to curate your own binder.',
            },
          ],
        };
      default:
        return { title: 'How binders work', sections: [] as Array<{ h: string; t: string }> };
    }
  }, [demoBinderType]);

  const binderTypeGuide = useMemo(() => {
    switch (demoBinderType) {
      case 'master_set':
        return {
          bestFor: ['Set completion mindset', 'Checklist tracking', 'Seeing missing slots fast'],
          whatChanges: [
            'Grid is a checklist (slots are Pokémon/form entries).',
            'Tapping a slot lets you pick which exact card/version you own.',
            'Progress is meaningful: collected vs missing.',
          ],
          gotchas: [
            'Some Pokémon have extra entries (forms like Mega/VMAX, etc.).',
            'Variants still matter — you may need the exact version to count.',
          ],
        };
      case 'single_pokemon':
        return {
          bestFor: ['“Collect every card of one Pokémon” goals', 'Chasing variants', 'Multi-language collecting'],
          whatChanges: [
            'You’re tracking printings for one Pokémon across sets.',
            'Collect/uncollect individual printings.',
            'Great when you want completeness for a single Pokémon rather than a set.',
          ],
          gotchas: ['Big lists can be long — use search and filters.', 'Some images may require user upload (fallback supported).'],
        };
      case 'by_set':
        return {
          bestFor: ['Finishing a specific set', 'Tracking holo/reverse printings', 'Clear set progress'],
          whatChanges: [
            'Every card/variant in that set can be collected.',
            'If a card has versions, you can switch the selected version.',
            'Progress is card-count based for the set.',
          ],
          gotchas: ['Promo/jumbo or special subsets might be missing in databases for some sets (we show hints when so).'],
        };
      case 'custom':
        return {
          bestFor: ['Trade binders', 'Theme binders', 'Personal collections'],
          whatChanges: [
            'No checklist — you curate what belongs in the binder.',
            'Add/remove cards freely (manual entries supported).',
            'Best when structure matters less than presentation.',
          ],
          gotchas: ['Completion % isn’t the goal here — it’s your own layout.'],
        };
      default:
        return { bestFor: [], whatChanges: [], gotchas: [] as string[] };
    }
  }, [demoBinderType]);

  const finish = useCallback(async () => {
    await setOnboardingSeen();
    router.replace('/auth-choice');
  }, [router]);

  const skip = useCallback(() => {
    hapticLight();
    Alert.alert(
      'Skip onboarding?',
      'You can always learn these features later, but onboarding helps you get started faster.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Skip', style: 'destructive', onPress: () => void finish() },
      ]
    );
  }, [finish]);

  const next = useCallback(() => {
    hapticLight();
    if (isLast) {
      void finish();
      return;
    }
    const nextIdx = Math.min(index + 1, SLIDES.length - 1);
    setIndex(nextIdx);
  }, [finish, index, isLast]);

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      <View style={s.topBar}>
        <Text style={s.brand}>Oakedex</Text>
        <Pressable style={({ pressed }) => [s.skipBtn, pressed && s.pressed]} onPress={skip}>
          <Text style={s.skipText}>Skip</Text>
        </Pressable>
      </View>

      <ScrollView
        style={s.slide}
        contentContainerStyle={[
          s.slideContent,
          {
            // Extra "dead zone" so content never sits under phone UI.
            paddingTop: 26,
            paddingBottom: Math.max(28, insets.bottom + 24),
          },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={s.card}>
          {slide.key === 'welcome' ? (
            <View style={s.logoWrap}>
              <Image source={require('@/assets/images/icon.png')} style={s.logo} />
            </View>
          ) : null}
          <Text style={s.title}>{slide.title}</Text>
          <Text style={s.body}>{slide.body}</Text>

          {slide.key === 'binders' ? (
            <>
              <View style={s.demoCard}>
                <Text style={s.demoTitle}>Mini demo</Text>

                <View style={s.previewRow}>
                  <View style={s.previewBinderWrap}>
                    <BinderCover
                      width={120}
                      height={164}
                      color={getBinderColorHex(demoBinderColorId)}
                    />
                    <View style={s.previewRibbon} pointerEvents="none">
                      <Text style={s.previewRibbonText} numberOfLines={1}>
                        {(demoBinderName.trim() || 'Binder').slice(0, 24)}
                      </Text>
                      <Text style={s.previewRibbonSub} numberOfLines={1}>
                        {demoBinderType === 'master_set'
                          ? 'Master Set'
                          : demoBinderType === 'single_pokemon'
                            ? 'Single Pokémon'
                            : demoBinderType === 'by_set'
                              ? 'By Set'
                              : 'Custom'}
                      </Text>
                    </View>
                  </View>
                  <View style={s.previewRight}>
                    <Text style={s.demoLabel}>Binder color</Text>
                    <View style={s.colorRow}>
                      {BINDER_COLOR_OPTIONS.map((opt) => {
                        const selected = demoBinderColorId === opt.id;
                        return (
                          <Pressable
                            key={opt.id}
                            style={({ pressed }) => [
                              s.colorSwatch,
                              { backgroundColor: opt.hex },
                              selected && s.colorSwatchSelected,
                              pressed && s.pressed,
                            ]}
                            onPress={() => {
                              hapticLight();
                              setDemoBinderColorId(opt.id);
                            }}
                          />
                        );
                      })}
                    </View>
                  </View>
                </View>

                <Text style={s.demoLabel}>Binder name</Text>
                <TextInput
                  value={demoBinderName}
                  onChangeText={setDemoBinderName}
                  placeholder="e.g. Master Set — Gen 1"
                  placeholderTextColor="rgba(255,255,255,0.40)"
                  style={s.demoInput}
                  autoCapitalize="words"
                />

                <Text style={s.demoLabel}>Binder type</Text>
                <View style={s.typeRow}>
                  {(
                    [
                      { id: 'master_set', label: 'Master Set', hint: 'Completion tracking' },
                      { id: 'single_pokemon', label: 'Single Pokémon', hint: 'All printings' },
                      { id: 'by_set', label: 'By Set', hint: 'One set only' },
                      { id: 'custom', label: 'Custom', hint: 'Your own layout' },
                    ] as const
                  ).map((opt) => {
                    const selected = demoBinderType === opt.id;
                    return (
                      <Pressable
                        key={opt.id}
                        style={({ pressed }) => [
                          s.typePill,
                          selected && s.typePillSelected,
                          pressed && s.pressed,
                        ]}
                        onPress={() => setDemoBinderType(opt.id)}
                      >
                        <Text style={[s.typePillText, selected && s.typePillTextSelected]}>
                          {opt.label}
                        </Text>
                        <Text style={s.typePillHint} numberOfLines={1}>
                          {opt.hint}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Pressable
                  style={({ pressed }) => [
                    s.demoPrimaryBtn,
                    pressed && s.pressed,
                    (!demoBinderName.trim() || !demoBinderType) && s.demoPrimaryBtnDisabled,
                  ]}
                  disabled={!demoBinderName.trim() || !demoBinderType}
                  onPress={() => {
                    hapticLight();
                    Alert.alert(
                      'Demo created!',
                      `Name: ${demoBinderName.trim()}\nType: ${demoBinderType.replace('_', ' ')}`,
                      [{ text: 'OK' }]
                    );
                  }}
                >
                  <Text style={s.demoPrimaryText}>Create binder (demo)</Text>
                </Pressable>
              </View>

              <View style={s.explainCard}>
                <Text style={s.explainTitle}>{binderExplain.title}</Text>
                {binderExplain.sections.map((sec) => (
                  <View key={sec.h} style={s.explainSection}>
                    <Text style={s.explainHeading}>{sec.h}</Text>
                    <Text style={s.explainText}>{sec.t}</Text>
                  </View>
                ))}
              </View>
            </>
          ) : null}

          {slide.key === 'types' ? (
            <>
              <View style={s.demoCard}>
                <Text style={s.demoTitle}>Mini demo</Text>

                <Text style={s.demoLabel}>Pick a binder type</Text>
                <View style={s.typeRow}>
                  {(
                    [
                      { id: 'master_set', label: 'Master Set', hint: 'Completion tracking' },
                      { id: 'single_pokemon', label: 'Single Pokémon', hint: 'All printings' },
                      { id: 'by_set', label: 'By Set', hint: 'One set only' },
                      { id: 'custom', label: 'Custom', hint: 'Your own layout' },
                    ] as const
                  ).map((opt) => {
                    const selected = demoBinderType === opt.id;
                    return (
                      <Pressable
                        key={opt.id}
                        style={({ pressed }) => [
                          s.typePill,
                          selected && s.typePillSelected,
                          pressed && s.pressed,
                        ]}
                        onPress={() => {
                          hapticLight();
                          setDemoBinderType(opt.id);
                        }}
                      >
                        <Text style={[s.typePillText, selected && s.typePillTextSelected]}>{opt.label}</Text>
                        <Text style={s.typePillHint} numberOfLines={1}>{opt.hint}</Text>
                      </Pressable>
                    );
                  })}
                </View>

                <View style={s.guideRow}>
                  <View style={s.guideCol}>
                    <Text style={s.guideTitle}>Best for</Text>
                    {binderTypeGuide.bestFor.map((t) => (
                      <Text key={t} style={s.guideText}>• {t}</Text>
                    ))}
                  </View>
                  <View style={s.guideCol}>
                    <Text style={s.guideTitle}>What changes</Text>
                    {binderTypeGuide.whatChanges.map((t) => (
                      <Text key={t} style={s.guideText}>• {t}</Text>
                    ))}
                  </View>
                </View>
              </View>

              <View style={s.explainCard}>
                <Text style={s.explainTitle}>Deep dive</Text>

                <View style={s.explainSection}>
                  <Text style={s.explainHeading}>When to choose {demoBinderType.replace('_', ' ')}</Text>
                  <Text style={s.explainText}>
                    {demoBinderType === 'master_set'
                      ? 'Choose this when you care about completion tracking and want a structured checklist.'
                      : demoBinderType === 'single_pokemon'
                        ? 'Choose this when you’re hunting every printing for one Pokémon across many sets.'
                        : demoBinderType === 'by_set'
                          ? 'Choose this when your goal is finishing a specific set and tracking variants like holo/reverse.'
                          : 'Choose this when you want a binder you can curate manually (trade/theme/personal).'}
                  </Text>
                </View>

                {binderTypeGuide.gotchas.length > 0 ? (
                  <View style={s.explainSection}>
                    <Text style={s.explainHeading}>Good to know</Text>
                    {binderTypeGuide.gotchas.map((t) => (
                      <Text key={t} style={s.explainText}>• {t}</Text>
                    ))}
                  </View>
                ) : null}
              </View>
            </>
          ) : null}

          {slide.key === 'add-cards' ? (
            <>
              <View style={s.demoCard}>
                <Text style={s.demoTitle}>Mini demo</Text>

                <Text style={s.demoLabel}>Master Set binder (sprites + version picker)</Text>
                <View style={s.cardGrid}>
                  {demoMasterSlots.map((slot) => {
                    const selectedVariant = demoMasterCollected[slot.slotKey] ?? null;
                    const collected = selectedVariant != null;
                    const spriteUri = getPokemonSpriteUrl(slot.dexId);
                    const imageUri =
                      (selectedVariant ? (slot.versions as any)?.[selectedVariant] : null) ??
                      (slot.versions as any)?.normal ??
                      null;
                    return (
                      <Pressable
                        key={slot.slotKey}
                        style={({ pressed }) => [s.cardTile, pressed && s.pressed, collected && s.cardTileCollected]}
                        onPress={() => {
                          // In the real app this opens the version picker for the slot.
                          hapticLight();
                          setDemoPickerOpen({ slotKey: slot.slotKey });
                        }}
                      >
                        <View style={s.cardImgWrap}>
                          {collected && imageUri ? (
                            <CachedImage remoteUri={imageUri} style={s.cardImg} resizeMode="contain" />
                          ) : (
                            <Image
                              source={{ uri: spriteUri }}
                              style={[s.cardImg, s.spriteSilhouette]}
                              resizeMode="contain"
                            />
                          )}
                        </View>
                        <Text style={s.cardName} numberOfLines={1}>{slot.name}</Text>
                        <Text style={s.cardMeta} numberOfLines={1}>
                          {collected ? `Collected • ${selectedVariant}` : 'Missing'}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Text style={[s.demoLabel, { marginTop: 12 }]}>By Set binder (lit up vs greyed)</Text>
                <View style={s.cardGrid}>
                  {demoSetCards.map((c) => {
                    const key = c.slotKey;
                    const collected = demoSetCollected.has(key);
                    const uri = 'variants' in c ? c.variants.normal : c.uri;
                    return (
                      <Pressable
                        key={key}
                        style={({ pressed }) => [s.cardTile, pressed && s.pressed, collected && s.cardTileCollected]}
                        onPress={() => {
                          hapticLight();
                          toggleSetCard(key);
                        }}
                      >
                        <View style={s.cardImgWrap}>
                          <CachedImage remoteUri={uri} style={s.cardImg} resizeMode="contain" />
                          {!collected && <View style={s.greyscaleOverlay} pointerEvents="none" />}
                        </View>
                        <Text style={s.cardName} numberOfLines={1}>{c.name}</Text>
                        <Text style={s.cardMeta} numberOfLines={1}>
                          {collected ? 'Collected' : 'Missing'}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <Modal visible={demoPickerOpen != null} transparent animationType="fade" onRequestClose={() => setDemoPickerOpen(null)}>
                <Pressable style={s.pickerBackdrop} onPress={() => setDemoPickerOpen(null)}>
                  <Pressable style={s.pickerCard} onPress={(e) => e.stopPropagation()}>
                    <Text style={s.pickerTitle}>Choose version</Text>
                    <Text style={s.pickerHint}>This mirrors the real version picker in Edit mode.</Text>
                    <View style={s.versionRow}>
                      {pickerOptions.map(({ v, uri }) => {
                        const selected = (demoMasterCollected[demoPickerOpen?.slotKey ?? ''] ?? null) === v;
                        return (
                          <Pressable
                            key={v}
                            style={({ pressed }) => [
                              s.versionPickCard,
                              pressed && s.pressed,
                              selected && s.versionPickCardSelected,
                            ]}
                            onPress={() => {
                              hapticLight();
                              if (demoPickerOpen?.slotKey) setMasterSlotVariant(demoPickerOpen.slotKey, v);
                              setDemoPickerOpen(null);
                            }}
                          >
                            <View style={s.versionPickImgWrap}>
                              <CachedImage remoteUri={uri} style={s.versionPickImg} resizeMode="contain" />
                            </View>
                            <Text style={s.versionText}>
                              {v === 'normal' ? 'Normal' : v === 'holo' ? 'Holo' : 'Reverse'}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                    {demoPickerOpen?.slotKey ? (
                      <Pressable
                        style={({ pressed }) => [s.clearBtn, pressed && s.pressed]}
                        onPress={() => {
                          hapticLight();
                          clearMasterSlot(demoPickerOpen.slotKey);
                          setDemoPickerOpen(null);
                        }}
                      >
                        <Text style={s.clearBtnText}>Clear slot</Text>
                      </Pressable>
                    ) : null}
                  </Pressable>
                </Pressable>
              </Modal>

              <View style={s.explainCard}>
                <Text style={s.explainTitle}>Deep dive</Text>

                <View style={s.explainSection}>
                  <Text style={s.explainHeading}>Edit mode</Text>
                  <Text style={s.explainText}>
                    To change what’s collected, open the binder from Edit Collections. That keeps your binder safe from accidental taps.
                  </Text>
                </View>

                <View style={s.explainSection}>
                  <Text style={s.explainHeading}>Versions & variants</Text>
                  <Text style={s.explainText}>
                    Many cards have variants like holo or reverse holo. Oakedex lets you pick which version you own so progress stays accurate.
                  </Text>
                </View>

                <View style={s.explainSection}>
                  <Text style={s.explainHeading}>Missing images</Text>
                  <Text style={s.explainText}>
                    If a card image is missing, you can upload your own photo to keep your binder looking great.
                  </Text>
                </View>
              </View>
            </>
          ) : null}

          {slide.key === 'card-dex' ? (
            <>
              <View style={s.demoCard}>
                <Text style={s.demoTitle}>Mini demo</Text>

                <Text style={s.demoLabel}>Search</Text>
                <TextInput
                  value={dexQuery}
                  onChangeText={setDexQuery}
                  placeholder='Try: "pikachu" or "base1 4"'
                  placeholderTextColor="rgba(255,255,255,0.40)"
                  style={s.demoInput}
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                <Text style={[s.demoLabel, { marginTop: 6 }]}>Language</Text>
                <View style={s.langRow}>
                  {(
                    [
                      { id: 'en', label: 'EN' },
                      { id: 'fr', label: 'FR' },
                      { id: 'de', label: 'DE' },
                      { id: 'es', label: 'ES' },
                    ] as const
                  ).map((opt) => {
                    const selected = dexLang === opt.id;
                    return (
                      <Pressable
                        key={opt.id}
                        style={({ pressed }) => [
                          s.langPill,
                          selected && s.langPillSelected,
                          pressed && s.pressed,
                        ]}
                        onPress={() => {
                          hapticLight();
                          setDexLang(opt.id);
                        }}
                      >
                        <Text style={[s.langText, selected && s.langTextSelected]}>{opt.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Text style={[s.demoLabel, { marginTop: 6 }]}>Results</Text>
                <View style={s.dexResults}>
                  {dexFiltered.length === 0 ? (
                    <Text style={s.dexEmpty}>No matches in this demo set.</Text>
                  ) : (
                    dexFiltered.map((c) => (
                      <View key={c.id} style={s.dexRow}>
                        <View style={s.dexThumbWrap}>
                          <CachedImage remoteUri={c.image} style={s.dexThumb} resizeMode="contain" />
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={s.dexName} numberOfLines={1}>{c.name}</Text>
                          <Text style={s.dexMeta} numberOfLines={1}>
                            {c.setName} • #{c.localId} • {c.lang.toUpperCase()}
                          </Text>
                        </View>
                      </View>
                    ))
                  )}
                </View>
              </View>

              <View style={s.explainCard}>
                <Text style={s.explainTitle}>Deep dive</Text>

                <View style={s.explainSection}>
                  <Text style={s.explainHeading}>Smart search</Text>
                  <Text style={s.explainText}>
                    You can search by name (broad matching) or by set + number (like “base1 4”). Exact set-number matches are prioritized.
                  </Text>
                </View>

                <View style={s.explainSection}>
                  <Text style={s.explainHeading}>Languages</Text>
                  <Text style={s.explainText}>
                    Switch languages to find printings in other regions. (This demo uses a tiny dataset to stay fast.)
                  </Text>
                </View>
              </View>
            </>
          ) : null}

          {slide.key === 'wanted' ? (
            <>
              <View style={s.demoCard}>
                <Text style={s.demoTitle}>Mini demo</Text>

                <Text style={s.demoLabel}>List name</Text>
                <TextInput
                  value={wantedListName}
                  onChangeText={setWantedListName}
                  placeholder="e.g. Trade binder, Buy list…"
                  placeholderTextColor="rgba(255,255,255,0.40)"
                  style={s.demoInput}
                  autoCapitalize="words"
                />

                <View style={s.wantedHeaderRow}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={s.wantedTitle} numberOfLines={1}>{wantedListName.trim() || 'Wanted list'}</Text>
                    <Text style={s.wantedMeta}>
                      {wantedItems.length === 1 ? '1 card' : `${wantedItems.length} cards`}
                    </Text>
                  </View>
                  <Pressable
                    style={({ pressed }) => [s.wantedAddBtn, pressed && s.pressed]}
                    onPress={addWantedDemoItem}
                  >
                    <Text style={s.wantedAddText}>+ Add</Text>
                  </Pressable>
                </View>

                <View style={s.wantedList}>
                  {wantedItems.map((it) => (
                    <View key={it.id} style={s.wantedRow}>
                      <View style={s.wantedThumbWrap}>
                        <CachedImage remoteUri={it.image} style={s.wantedThumb} resizeMode="contain" />
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={s.wantedName} numberOfLines={1}>{it.name}</Text>
                        <Text style={s.wantedRowMeta} numberOfLines={1}>
                          {it.setName} • #{it.localId} • {it.variant === 'normal' ? 'Normal' : it.variant === 'holo' ? 'Holo' : 'Reverse'}
                        </Text>
                        <Text style={s.wantedIntent} numberOfLines={1}>
                          {it.intent === 'buy' ? 'Buy' : it.intent === 'trade' ? 'Trade' : 'Buy or trade'}
                          {it.note ? ` • ${it.note}` : ''}
                        </Text>
                      </View>
                      <Pressable
                        style={({ pressed }) => [s.wantedRemoveBtn, pressed && s.pressed]}
                        onPress={() => removeWantedDemoItem(it.id)}
                      >
                        <Text style={s.wantedRemoveText}>Remove</Text>
                      </Pressable>
                    </View>
                  ))}
                </View>

                <Text style={s.wantedHint}>
                  Tip: Keep separate lists for trade, buy, and long-term chase cards.
                </Text>
              </View>

              <View style={s.explainCard}>
                <Text style={s.explainTitle}>Deep dive</Text>

                <View style={s.explainSection}>
                  <Text style={s.explainHeading}>What Wanted lists are for</Text>
                  <Text style={s.explainText}>
                    Wanted lists help you track cards you’re actively hunting — for buying, trading, or either — without mixing them into your binders.
                  </Text>
                </View>

                <View style={s.explainSection}>
                  <Text style={s.explainHeading}>Variants + notes</Text>
                  <Text style={s.explainText}>
                    Save the exact version you want (normal / holo / reverse) and add notes like condition, language, or target price.
                  </Text>
                </View>

                <View style={s.explainSection}>
                  <Text style={s.explainHeading}>Sync</Text>
                  <Text style={s.explainText}>
                    If you’re logged in, Wanted lists can sync across devices. If not, they stay saved locally on your phone.
                  </Text>
                </View>
              </View>
            </>
          ) : null}
        </View>
      </ScrollView>

      <View style={[s.footer, { paddingBottom: Math.max(18, insets.bottom + 12) }]}>
        <View style={s.dotsRow}>
          {dots.map((k, i) => (
            <View key={k} style={[s.dot, i === index ? s.dotActive : s.dotInactive]} />
          ))}
        </View>

        <Pressable
          style={({ pressed }) => [s.primaryBtn, pressed && s.pressed]}
          onPress={next}
        >
          <Text style={s.primaryText}>{isLast ? 'Log in / Sign up' : 'Next'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: charcoal },
  topBar: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: charcoal,
    zIndex: 20,
    elevation: 20,
  },
  brand: { color: 'rgba(255,255,255,0.9)', fontWeight: '900', letterSpacing: 1 },
  skipBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  skipText: { color: 'rgba(255,255,255,0.9)', fontWeight: '800' },
  pressed: { opacity: 0.85 },
  slide: { flex: 1, paddingHorizontal: 20, zIndex: 0 },
  slideContent: {
    flexGrow: 1,
    justifyContent: 'center',
    // top/bottom padding is set dynamically using safe-area insets
  },
  card: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    paddingHorizontal: 6,
  },
  logoWrap: {
    alignItems: 'center',
    marginBottom: 14,
  },
  logo: {
    width: 96,
    height: 96,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 10,
    textAlign: 'left',
    flexShrink: 1,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: 'rgba(255,255,255,0.72)',
    textAlign: 'left',
    flexShrink: 1,
  },
  demoCard: {
    marginTop: 16,
    borderRadius: 14,
    padding: 14,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    gap: 10,
  },
  demoTitle: { color: '#fff', fontWeight: '900', fontSize: 14, textAlign: 'left' },
  demoLabel: { color: 'rgba(255,255,255,0.65)', fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  demoInput: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    color: '#fff',
  },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  typePill: {
    minWidth: 140,
    flexGrow: 1,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  typePillSelected: {
    borderColor: 'rgba(106, 68, 155, 0.95)',
    backgroundColor: 'rgba(106, 68, 155, 0.26)',
  },
  typePillText: { color: '#fff', fontWeight: '900', fontSize: 13, textAlign: 'left' },
  typePillTextSelected: { color: '#fff' },
  typePillHint: { color: 'rgba(255,255,255,0.65)', fontSize: 11, textAlign: 'left', marginTop: 2 },
  demoPrimaryBtn: {
    marginTop: 4,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(106, 68, 155, 0.42)',
    borderWidth: 1,
    borderColor: 'rgba(106, 68, 155, 0.85)',
  },
  demoPrimaryBtnDisabled: { opacity: 0.55 },
  demoPrimaryText: { color: '#fff', fontWeight: '900', fontSize: 15 },

  explainCard: {
    marginTop: 12,
    borderRadius: 14,
    padding: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    gap: 8,
  },
  explainTitle: { color: '#fff', fontWeight: '900', fontSize: 14, textAlign: 'left', marginBottom: 4 },
  explainSection: { gap: 6, marginTop: 2 },
  explainHeading: { color: 'rgba(255,255,255,0.85)', fontWeight: '900', fontSize: 12, textTransform: 'uppercase' },
  explainText: { color: 'rgba(255,255,255,0.70)', fontSize: 13, lineHeight: 19, textAlign: 'left' },
  guideRow: { flexDirection: 'row', gap: 12, marginTop: 6, flexWrap: 'wrap' },
  guideCol: {
    flex: 1,
    minWidth: 190,
    borderRadius: 12,
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.20)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    gap: 6,
  },
  guideTitle: { color: '#fff', fontWeight: '900', fontSize: 12, textTransform: 'uppercase' },
  guideText: { color: 'rgba(255,255,255,0.72)', fontSize: 13, lineHeight: 18 },
  cardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between' },
  cardTile: {
    width: '48%',
    minWidth: 150,
    borderRadius: 14,
    padding: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  cardTileCollected: {
    borderColor: 'rgba(106, 68, 155, 0.95)',
    backgroundColor: 'rgba(106, 68, 155, 0.18)',
  },
  cardImgWrap: { width: '100%', aspectRatio: 2.5 / 3.5, borderRadius: 12, overflow: 'hidden' },
  cardImg: { width: '100%', height: '100%' },
  checkBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: { color: '#fff', fontWeight: '900', fontSize: 13 },
  cardName: { color: '#fff', fontWeight: '900', fontSize: 13, marginTop: 8 },
  cardMeta: { color: 'rgba(255,255,255,0.65)', fontWeight: '800', fontSize: 12, marginTop: 2 },
  greyscaleOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  spriteSilhouette: {
    opacity: 0.28,
    tintColor: '#000',
  },
  pickerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    padding: 20,
  },
  pickerCard: {
    borderRadius: 14,
    padding: 16,
    backgroundColor: 'rgba(40,40,40,0.98)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    maxWidth: 560,
    width: '100%',
    alignSelf: 'center',
  },
  pickerTitle: { color: '#fff', fontWeight: '900', fontSize: 16, marginBottom: 4 },
  pickerHint: { color: 'rgba(255,255,255,0.65)', fontSize: 12, marginBottom: 12, lineHeight: 17 },
  versionRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  versionPickCard: {
    flexGrow: 1,
    minWidth: 150,
    borderRadius: 14,
    padding: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    gap: 8,
    alignItems: 'flex-start',
  },
  versionPickCardSelected: {
    borderColor: 'rgba(106, 68, 155, 0.95)',
    backgroundColor: 'rgba(106, 68, 155, 0.18)',
  },
  versionPickImgWrap: { width: '100%', aspectRatio: 2.5 / 3.5, borderRadius: 12, overflow: 'hidden' },
  versionPickImg: { width: '100%', height: '100%' },
  versionText: { color: '#fff', fontWeight: '900', fontSize: 13 },
  clearBtn: {
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  clearBtnText: { color: 'rgba(255,255,255,0.9)', fontWeight: '900' },
  langRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  langPill: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  langPillSelected: {
    borderColor: 'rgba(106, 68, 155, 0.95)',
    backgroundColor: 'rgba(106, 68, 155, 0.22)',
  },
  langText: { color: '#fff', fontWeight: '900', fontSize: 13 },
  langTextSelected: { color: '#fff' },
  dexResults: { marginTop: 6, gap: 10 },
  dexRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  dexThumbWrap: {
    width: 46,
    height: 64,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  dexThumb: { width: '100%', height: '100%' },
  dexName: { color: '#fff', fontWeight: '900', fontSize: 14 },
  dexMeta: { color: 'rgba(255,255,255,0.65)', fontWeight: '800', fontSize: 12, marginTop: 2 },
  dexEmpty: { color: 'rgba(255,255,255,0.65)', fontSize: 12, lineHeight: 17 },
  wantedHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 },
  wantedTitle: { color: '#fff', fontWeight: '900', fontSize: 14 },
  wantedMeta: { color: 'rgba(255,255,255,0.65)', fontWeight: '800', fontSize: 12, marginTop: 2 },
  wantedAddBtn: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(106, 68, 155, 0.42)',
    borderWidth: 1,
    borderColor: 'rgba(106, 68, 155, 0.85)',
  },
  wantedAddText: { color: '#fff', fontWeight: '900' },
  wantedList: { marginTop: 10, gap: 10 },
  wantedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  wantedThumbWrap: {
    width: 46,
    height: 64,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  wantedThumb: { width: '100%', height: '100%' },
  wantedName: { color: '#fff', fontWeight: '900', fontSize: 14 },
  wantedRowMeta: { color: 'rgba(255,255,255,0.65)', fontWeight: '800', fontSize: 12, marginTop: 2 },
  wantedIntent: { color: 'rgba(255,255,255,0.60)', fontWeight: '800', fontSize: 12, marginTop: 2 },
  wantedRemoveBtn: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
  },
  wantedRemoveText: { color: 'rgba(255,255,255,0.92)', fontWeight: '900', fontSize: 12 },
  wantedHint: { color: 'rgba(255,255,255,0.65)', fontSize: 12, lineHeight: 17, marginTop: 10 },
  previewRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  previewBinderWrap: {
    width: 124,
    alignItems: 'center',
  },
  previewRibbon: {
    marginTop: 10,
    width: '100%',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(0,0,0,0.28)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  previewRibbonText: { color: '#fff', fontWeight: '900', fontSize: 12 },
  previewRibbonSub: { color: 'rgba(255,255,255,0.65)', fontWeight: '800', fontSize: 11, marginTop: 2 },
  previewRight: { flex: 1, minWidth: 0 },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 },
  colorSwatch: {
    width: 28,
    height: 28,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  colorSwatchSelected: {
    borderColor: '#fff',
    borderWidth: 2,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    backgroundColor: charcoal,
  },
  dotsRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 14 },
  dot: { width: 8, height: 8, borderRadius: 99 },
  dotActive: { backgroundColor: primary },
  dotInactive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  primaryBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(106, 68, 155, 0.35)',
    borderWidth: 1,
    borderColor: 'rgba(106, 68, 155, 0.7)',
  },
  primaryText: { color: '#fff', fontWeight: '900', fontSize: 16 },
});

