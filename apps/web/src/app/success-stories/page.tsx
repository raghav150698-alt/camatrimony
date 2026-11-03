"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, HeartHandshake } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { getApiClient } from "@camatrimony/api-client";
interface Story { id:number; bride_name:string; groom_name:string; location?:string; description:string; image_url?:string; }
export default function StoriesPage(){
 const [stories,setStories]=useState<Story[]>([]);const [loading,setLoading]=useState(true);const [error,setError]=useState(false);
 useEffect(()=>{let cancelled=false;getApiClient().get<Story[]>("/stories").then(result=>{if(cancelled)return;if(result.success&&Array.isArray(result.data))setStories(result.data);else setError(true);}).finally(()=>{if(!cancelled)setLoading(false);});return()=>{cancelled=true;};},[]);
 return <Layout><div className="site-container"><header className="static-hero"><p className="site-eyebrow">COMMUNITY STORIES</p><h1>A connection.<br /><em>A chapter together.</em></h1><p>Stories shared by members and selected by our team.</p></header><section className="static-section">{loading?<div role="status" className="profile-loading">Loading stories…</div>:stories.length?<div className="static-grid">{stories.map(story=><article className="static-card story-card" key={story.id}>{story.image_url&&<img src={story.image_url} alt={`${story.bride_name} and ${story.groom_name}`} loading="lazy"/>}<h2>{story.bride_name} & {story.groom_name}</h2>{story.location&&<small>{story.location}</small>}<p>{story.description}</p></article>)}</div>:<div className="story-empty"><HeartHandshake size={36} strokeWidth={1.2}/><h2>{error?"Stories are taking a moment.":"Every story begins somewhere."}</h2><p>{error?"Please check back shortly, or contact our team.":"When members choose to share their journey, you’ll find it here. Have a story of your own? We’d love to hear it."}</p><Link className="site-action site-action-outline" href="/contact">Get in touch<ArrowRight size={16}/></Link></div>}</section></div></Layout>;
}
