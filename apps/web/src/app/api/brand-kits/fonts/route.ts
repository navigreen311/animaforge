import { NextResponse } from 'next/server';

const GOOGLE_FONTS = [
  { name: 'Inter', category: 'sans-serif', variants: ['300', '400', '500', '600', '700', '800'] },
  { name: 'Roboto', category: 'sans-serif', variants: ['300', '400', '500', '700', '900'] },
  { name: 'Playfair Display', category: 'serif', variants: ['400', '500', '600', '700', '800', '900'] },
  { name: 'DM Sans', category: 'sans-serif', variants: ['400', '500', '700'] },
  { name: 'Space Grotesk', category: 'sans-serif', variants: ['300', '400', '500', '600', '700'] },
  { name: 'Poppins', category: 'sans-serif', variants: ['300', '400', '500', '600', '700', '800'] },
  { name: 'Montserrat', category: 'sans-serif', variants: ['300', '400', '500', '600', '700', '800', '900'] },
  { name: 'Open Sans', category: 'sans-serif', variants: ['300', '400', '500', '600', '700', '800'] },
  { name: 'Lato', category: 'sans-serif', variants: ['300', '400', '700', '900'] },
  { name: 'Raleway', category: 'sans-serif', variants: ['300', '400', '500', '600', '700', '800'] },
  { name: 'Merriweather', category: 'serif', variants: ['300', '400', '700', '900'] },
  { name: 'Source Sans Pro', category: 'sans-serif', variants: ['300', '400', '600', '700', '900'] },
  { name: 'Nunito', category: 'sans-serif', variants: ['300', '400', '500', '600', '700', '800'] },
  { name: 'Work Sans', category: 'sans-serif', variants: ['300', '400', '500', '600', '700', '800'] },
  { name: 'Fira Sans', category: 'sans-serif', variants: ['300', '400', '500', '600', '700', '800'] },
  { name: 'PT Sans', category: 'sans-serif', variants: ['400', '700'] },
  { name: 'Barlow', category: 'sans-serif', variants: ['300', '400', '500', '600', '700', '800'] },
  { name: 'Josefin Sans', category: 'sans-serif', variants: ['300', '400', '500', '600', '700'] },
  { name: 'Quicksand', category: 'sans-serif', variants: ['300', '400', '500', '600', '700'] },
  { name: 'Mulish', category: 'sans-serif', variants: ['300', '400', '500', '600', '700', '800'] },
];

export async function GET() {
  return NextResponse.json({
    fonts: GOOGLE_FONTS,
    total: GOOGLE_FONTS.length,
  });
}
