import type {Metadata,Viewport} from 'next';import './globals.css';import './production.css';import './multicharacter.css';import './details.css';import './beta.css';import './overview.css';import './news.css';import './clones.css';
export const metadata:Metadata={title:'EVE Character Control – Web-Beta',description:'Inoffizielles mobiles Kommando-Dashboard für EVE Online Charaktere',manifest:'/manifest.json',appleWebApp:{capable:true,statusBarStyle:'black-translucent',title:'EVE Control'},icons:{icon:'/icons/app-icon-192.png',apple:'/icons/app-icon-192.png'}};
export const viewport:Viewport={themeColor:'#071116',width:'device-width',initialScale:1};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="de"><body>{children}</body></html>}
import './isk-goals.css';
