
export type Theme = {
  name: string;
  primary: {
    light: string; // HSL value 'h s% l%'
    dark: string;
  };
};

export const themes: Theme[] = [
  { name: 'Default', primary: { light: '258 83% 65%', dark: '258 75% 60%' } },
  { name: 'Red', primary: { light: '0 84% 60%', dark: '0 72% 51%' } },
  { name: 'Orange', primary: { light: '25 95% 53%', dark: '25 90% 48%' } },
  { name: 'Yellow', primary: { light: '45 93% 47%', dark: '48 96% 47%' } },
  { name: 'Green', primary: { light: '142 76% 36%', dark: '142 60% 31%' } },
  { name: 'Teal', primary: { light: '162 72% 42%', dark: '162 82% 34%' } },
  { name: 'Blue', primary: { light: '217 91% 60%', dark: '217 91% 55%' } },
  { name: 'Indigo', primary: { light: '243 93% 63%', dark: '243 83% 58%' } },
  { name: 'Purple', primary: { light: '262 84% 60%', dark: '262 74% 55%' } },
  { name: 'Pink', primary: { light: '330 84% 60%', dark: '330 74% 55%' } },
  { name: 'Slate', primary: { light: '215 28% 47%', dark: '215 20% 65%' } },
  { name: 'Gray', primary: { light: '220 9% 46%', dark: '215 14% 65%' } },
  { name: 'Zinc', primary: { light: '220 13% 46%', dark: '220 9% 65%' } },
  { name: 'Stone', primary: { light: '25 15% 46%', dark: '25 8% 65%' } },
  { name: 'Lime', primary: { light: '84 76% 42%', dark: '84 66% 37%' } },
  { name: 'Emerald', primary: { light: '158 76% 36%', dark: '158 66% 31%' } },
  { name: 'Cyan', primary: { light: '188 82% 44%', dark: '188 72% 39%' } },
  { name: 'Sky', primary: { light: '199 98% 54%', dark: '199 88% 49%' } },
  { name: 'Violet', primary: { light: '250 84% 60%', dark: '250 74% 55%' } },
  { name: 'Fuchsia', primary: { light: '304 84% 60%', dark: '304 74% 55%' } },
  { name: 'Rose', primary: { light: '346 84% 60%', dark: '346 74% 55%' } },
];
