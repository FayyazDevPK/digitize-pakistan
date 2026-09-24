from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.content.models import Category, Content

TOOLS = [
    {
        "slug": "elevenlabs",
        "title": "ElevenLabs",
        "category": ("Voice", "voice"),
        "excerpt": "Realistic text-to-speech and voice cloning, with natural-sounding Urdu voices.",
        "body": (
            "ElevenLabs produces some of the most natural-sounding synthetic speech available, "
            "including Urdu. It suits YouTubers, e-learning creators and anyone producing "
            "voice-overs at volume. The free tier is generous enough to evaluate it properly."
        ),
        "pros": "Very natural narration, including Urdu\nDubbing and voice cloning built in\nUseful free tier to test quality",
        "cons": "Billed in USD only\nVoice cloning needs the speaker's consent\nFree tier has a monthly character cap",
        "pricing_info": "Free tier with a monthly character quota\nPaid plans billed monthly in USD, starting from a few dollars a month\nCheck the vendor site for current pricing",
        "days_ago": 20,
        "alternatives": ["murf-ai", "google-cloud-text-to-speech"],
    },
    {
        "slug": "murf-ai",
        "title": "Murf AI",
        "category": ("Voice", "voice"),
        "excerpt": "Studio-style text-to-speech for presentations, explainers and ads.",
        "body": (
            "Murf AI is a browser-based voice-over studio: paste a script, pick a voice, adjust "
            "pacing and emphasis, and export. It is aimed at business and training content rather "
            "than open-ended creative work."
        ),
        "pros": "Simple studio-style editor\nGood for corporate and training voice-overs\nTeam collaboration features",
        "cons": "Fewer voice-cloning options than some rivals\nBest features sit behind paid plans\nBilled in USD",
        "pricing_info": "Free trial with limited exports\nPaid plans billed in USD\nCheck the vendor site for current pricing",
        "days_ago": 12,
        "alternatives": ["elevenlabs"],
    },
    {
        "slug": "google-cloud-text-to-speech",
        "title": "Google Cloud Text-to-Speech",
        "category": ("Voice", "voice"),
        "excerpt": "Pay-as-you-go speech synthesis API for developers building voice into products.",
        "body": (
            "Google Cloud Text-to-Speech is an API rather than a consumer app: you send text and "
            "receive audio, billed by characters synthesised. It is a fit for developers who want "
            "voice inside their own product."
        ),
        "pros": "Scales cleanly for production apps\nPay only for what you synthesise\nMany languages and voices",
        "cons": "Developer-oriented, no friendly editor\nRequires a Google Cloud account and billing set-up\nVoices are less expressive than the newest specialist tools",
        "pricing_info": "Monthly free allowance of characters\nThen pay-as-you-go per million characters\nCheck the vendor documentation for current rates",
        "days_ago": 6,
        "alternatives": ["elevenlabs", "murf-ai"],
    },
    {
        "slug": "perplexity",
        "title": "Perplexity",
        "category": ("Research", "research"),
        "excerpt": "Answer engine that searches the web and cites its sources.",
        "body": (
            "Perplexity answers questions by searching the web and citing the pages it used, which "
            "makes it faster than manual searching for first-pass research. Always open the "
            "citations: summaries can still be wrong."
        ),
        "pros": "Every answer links to its sources\nFast for first-pass research\nUseful free tier",
        "cons": "Summaries can misstate the source\nDeeper research features need a paid plan\nNot a replacement for reading primary documents",
        "pricing_info": "Free tier with limited advanced searches\nPro plan billed monthly in USD\nCheck the vendor site for current pricing",
        "days_ago": 2,
        "alternatives": [],
    },
]


class Command(BaseCommand):
    help = "Seed real AI tool listings (idempotent) so the tools directory has content."

    def handle(self, *args, **options):
        author = get_user_model().objects.filter(is_superuser=True).order_by("pk").first()
        if author is None:
            self.stderr.write("Create a superuser first (needed as the listing author).")
            return

        now = timezone.now()
        created = {}
        for t in TOOLS:
            cat, _ = Category.objects.get_or_create(
                slug=t["category"][1], defaults={"name": t["category"][0]}
            )
            obj, was_created = Content.objects.update_or_create(
                slug=t["slug"],
                defaults={
                    "author": author,
                    "type": "TOOL_LISTING",
                    "title": t["title"],
                    "body": t["body"],
                    "excerpt": t["excerpt"],
                    "category": cat,
                    "visibility": "PUBLIC",
                    "status": "PUBLISHED",
                    "pros": t["pros"],
                    "cons": t["cons"],
                    "pricing_info": t["pricing_info"],
                },
            )
            if was_created:
                obj.published_at = now - timedelta(days=t["days_ago"])
                obj.save(update_fields=["published_at"])
            created[t["slug"]] = obj
            self.stdout.write(f"{'created' if was_created else 'updated'} {obj.slug}")

        for t in TOOLS:
            created[t["slug"]].alternatives.set([created[s] for s in t["alternatives"]])
