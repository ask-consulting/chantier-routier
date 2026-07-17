# 01 — Analyse du marché & des solutions existantes

## 1. Contexte du besoin

La gestion de chantiers routiers repose aujourd'hui, dans beaucoup de PME de TP, sur un
mélange d'outils non spécialisés :

- **Excel / Google Sheets** pour les dépenses et le planning,
- **WhatsApp** pour la communication et l'envoi de photos,
- **Feuilles papier** pour le pointage des ouvriers,
- **Logiciel comptable** déconnecté du terrain.

**Conséquences :** ressaisies multiples, données non fiables, dérive des coûts détectée
trop tard, litiges sur les heures des ouvriers, aucune vision temps réel de la marge par
chantier.

## 2. Panorama des solutions existantes

### 2.1 Grandes plateformes internationales (BTP généraliste)

| Solution | Origine | Forces | Faiblesses pour notre cible |
|---|---|---|---|
| **Procore** | 🇺🇸 | Très complet, référence mondiale, gestion financière poussée | Cher, complexe, orienté gros bâtiment/GC, surdimensionné pour une PME routière |
| **Autodesk Construction Cloud (BuildingConnected, PlanGrid)** | 🇺🇸 | Intégration BIM, plans, suivi terrain | Cher, courbe d'apprentissage forte, peu adapté au linéaire routier |
| **Fieldwire** | 🇺🇸 | Excellent sur le terrain, tâches, plans, mobile | Centré plan/tâches, faible sur coûts & paie ouvrier |
| **Buildertrend** | 🇺🇸 | Bon pour la construction résidentielle, devis/facturation | Orienté résidentiel US, pas de logique chantier linéaire |

### 2.2 Solutions francophones (plus proches de la cible)

| Solution | Forces | Faiblesses |
|---|---|---|
| **Alobees** | Suivi de chantier, pointage, main d'œuvre, mobile FR | Généraliste BTP, peu spécialisé routier |
| **Graneet** | Gestion financière chantier, situations de travaux, devis | Orienté gestion/facturation, moins terrain/pointage |
| **Vertuoza** | ERP BTP PME, devis-facture-chantier | Lourd, orienté artisan/bâtiment |
| **Tolteck / Batappli** | Devis & facturation artisans BTP | Pas de gestion multi-ouvriers ni pointage terrain |
| **Finalcad / Kizeo Forms** | Formulaires terrain, relevés, qualité | Outils de saisie, pas une gestion de projet complète |
| **Kelio / Bodet, Skello, Combo** | Pointage & planning RH | RH pur, non lié au chantier ni aux coûts |

### 2.3 Outils de pointage / temps

- **Skello, Combo, Kelio, Bodet** : bons sur la paie/RH mais déconnectés du chantier.
- **Badgeuses physiques** : coût matériel, pas de mobilité, pas de géolocalisation chantier.

## 3. Synthèse : le « trou » dans le marché

```
                 Simple / Terrain
                        ▲
                        │
     Kizeo/Finalcad     │      ⭐ NOTRE POSITIONNEMENT
     (formulaires)      │      (chantier routier + coûts + pointage,
                        │       mobile-first, hors-ligne, abordable)
   ─────────────────────┼─────────────────────► Complet / Gestion
                        │
     WhatsApp/Excel     │      Procore / Autodesk
     (bricolage)        │      (puissant mais cher & complexe)
                        │
                 Complexe / Bureau
```

**Aucune solution ne combine bien, à prix PME :**
1. La **spécificité routière** (chantiers linéaires, sections, ateliers/engins, métrés).
2. Le **suivi des coûts en temps réel** (main d'œuvre + matériaux + engins) par chantier.
3. Le **pointage terrain des ouvriers** simple, mobile, hors-ligne, géolocalisé.
4. Un **prix et une simplicité** adaptés aux PME du Maghreb / francophones.

## 4. Facteurs différenciants visés

- 📱 **Mobile-first & hors-ligne** : les chantiers routiers manquent souvent de réseau.
- 🌍 **Adapté au marché francophone / Maghreb** : langue, devise, pratiques locales.
- 💰 **Coût de main d'œuvre lié au pointage** : le pointage alimente directement le coût réel du chantier.
- 🧭 **Géolocalisation du pointage** : preuve de présence sur le bon chantier.
- 💸 **Modèle abordable** : freemium / prix par utilisateur bas.

## 5. Risques concurrentiels

| Risque | Mitigation |
|---|---|
| Alobees ou un acteur FR ajoute la spécialisation routière | Aller vite sur le terrain, se concentrer sur l'UX ouvrier + hors-ligne |
| Résistance au changement (papier/Excel ancrés) | Onboarding ultra simple, import Excel, valeur visible en 1 chantier |
| Acteur local low-cost | Différenciation par la fiabilité hors-ligne et le suivi de marge |

## 6. Conclusion

Le marché est mûr (digitalisation du BTP en cours) mais **mal servi sur le segment
PME routière francophone**. Un MVP centré sur **projet + dépenses + planning + pointage
ouvrier**, mobile-first et hors-ligne, a un espace clair. Voir
[`02-mvp-perimetre.md`](02-mvp-perimetre.md) pour le périmètre.
