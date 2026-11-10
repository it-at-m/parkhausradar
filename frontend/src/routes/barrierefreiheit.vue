<template>
  <text-page
    german-only
    title="Erklärung zur Barrierefreiheit nach BayDiV"
  >
    <p>
      Die Landeshauptstadt München ist bemüht, das Parkhausradar gemäß der
      <a
        href="https://www.gesetze-bayern.de/Content/Document/BayDiV"
        target="_blank"
        rel="noopener noreferrer"
        >Bayerischen Digitalverordnung<span class="d-sr-only">
          (öffnet in neuem Tab)</span
        ></a
      >
      (BayDiV) und der
      <a
        href="https://eur-lex.europa.eu/legal-content/DE/LSU/?uri=CELEX:32016L2102"
        target="_blank"
        rel="noopener noreferrer"
        >Richtlinie (EU) 2016/2102<span class="d-sr-only">
          (öffnet in neuem Tab)</span
        ></a
      >
      barrierefrei zugänglich zu machen. Diese Erklärung gilt für die
      Webanwendung Parkhausradar, unabhängig davon, unter welcher Adresse sie
      aufgerufen wird.
    </p>

    <h2 class="text-title-large">
      Stand der Vereinbarkeit mit den Anforderungen
    </h2>
    <p>
      Diese Webanwendung ist mit den Anforderungen der BayDiV teilweise
      vereinbar.
    </p>

    <h2 class="text-title-large">Nicht barrierefreie Inhalte</h2>
    <p>
      <strong>Karte:</strong> Die Beschriftungen der Karte sind für Screenreader
      nicht lesbar, und auf Touchscreens lässt sich die Karte teilweise nur mit
      Gesten bedienen. Alle Parkhäuser mit ihren Daten finden Sie barrierefrei
      in der Parkhausliste, die Sie über die Schaltfläche „Parkhausradar“ oben
      links öffnen.
    </p>
    <p>
      <strong>Externe Angebote:</strong> Die verlinkten Routenplaner und
      Websites der Parkhausbetreiber sind Angebote Dritter, für deren
      Barrierefreiheit wir nicht verantwortlich sind.
    </p>

    <h2 class="text-title-large">
      Erstellung dieser Erklärung zur Barrierefreiheit
    </h2>
    <p>
      Diese Erklärung wurde am 29. Oktober 2026 erstellt und zuletzt am 10.
      November 2026 überprüft. Sie beruht auf einer Selbstbewertung auf
      Grundlage der WCAG 2.1, Konformitätsstufe AA.
    </p>

    <h2 class="text-title-large">Hilfe und Kontaktaufnahme bei Problemen</h2>
    <p>
      Sie können uns Mängel bei der Barrierefreiheit mitteilen. Informationen,
      die nicht barrierefrei dargestellt werden müssen, können Sie bei uns
      barrierefrei anfordern.
    </p>
    <address>
      Landeshauptstadt München<br />
      IT-Referat, InnovationLab<br />
      E-Mail: <a href="mailto:innolab@muenchen.de">innolab@muenchen.de</a>
    </address>

    <h2 class="text-title-large">Durchsetzungsverfahren</h2>
    <p>
      Bleibt eine Anfrage an die Kontaktstelle innerhalb von sechs Wochen ganz
      oder teilweise unbeantwortet, können Sie eine Prüfung bei der zuständigen
      Aufsichtsbehörde beantragen:
    </p>
    <address>
      Landesamt für Digitalisierung, Breitband und Vermessung<br />
      IT-Dienstleistungszentrum des Freistaats Bayern<br />
      Durchsetzungs- und Überwachungsstelle<br />
      für barrierefreie Informationstechnik<br />
      St.-Martin-Straße 47<br />
      81541 München<br />
      E-Mail: <a href="mailto:bitv@ldbv.bayern.de">bitv@ldbv.bayern.de</a><br />
      Online:
      <a
        href="https://formularserver.bayern.de/intelliform/forms/rzsued/ldbv/ldbv/anforderungen_barrierefreiheit/index"
        target="_blank"
        rel="noopener noreferrer"
        >Antrag auf Prüfung der Barrierefreiheit<span class="d-sr-only">
          (öffnet in neuem Tab)</span
        ></a
      >
    </address>
  </text-page>
</template>

<script setup lang="ts">
import TextPage from "@/components/TextPage.vue";
</script>
