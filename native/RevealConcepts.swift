// RevealConcepts.swift — NGW Event Boss · the create-Reveal, native.
//
// SwiftUI port of the three cinema concepts (host calibration 2026-07-27:
// "Apple keynote + film title sequence" — typography enormous, ONE perfect
// beat, precision light, cinematic pacing):
//
//   A · THE TITLE    — film credits: light passes THROUGH the letterforms
//   B · THE MONOLITH — keynote: one precision zoom, one glint, rack focus
//   C · DAWN         — the name in silhouette until first light ignites it
//
// Self-contained: drop into any iOS 17+ / macOS 14+ target (or an Xcode
// preview) and run. Fonts: bundle "PlayfairDisplay-Bold" and
// "Newsreader-Italic" (the locked stationery + guide voices); every sans
// surface uses the system font — true SF Pro, which the web build can only
// approximate. Falls back to serif system designs if the customs are absent.
//
// Reduced Motion honors the product rule: the theater never plays — the
// resolved state renders immediately (same law as the shipped web reveal).

import SwiftUI

// MARK: - The understanding (real engine data shape, sample values)

struct RevealUnderstanding {
    var eventName: String = "My Crab Feast"
    var identityLine: String = "A seafood feast and a gathering."
    var rows: [(label: String, value: String, attention: Bool)] = [
        ("YOUR DAY", "5 moments", false),
        ("THE CROWD", "23 guests", false),
        ("FOOD & DRINK", "10 items", false),
        ("VENUE", "still open", true),
    ]
}

// MARK: - Palette (the reveal's locked dark-stage literals)

private enum Stage {
    static let bg = Color(red: 0.031, green: 0.035, blue: 0.043)
    static let ink = Color(red: 0.949, green: 0.957, blue: 0.969)
    static let grey = Color(red: 0.604, green: 0.655, blue: 0.698)
    static let dim = Color(red: 0.478, green: 0.529, blue: 0.573)
    static let steelSoft = Color(red: 0.541, green: 0.639, blue: 0.690)
    static let gold = Color(red: 0.910, green: 0.706, blue: 0.420)
    static let charcoalType = Color(red: 0.15, green: 0.17, blue: 0.20)
}

private extension Font {
    static func display(_ size: CGFloat) -> Font {
        .custom("PlayfairDisplay-Bold", size: size, relativeTo: .largeTitle)
    }
    static func guide(_ size: CGFloat) -> Font {
        .custom("Newsreader-Italic", size: size, relativeTo: .body)
    }
}

// MARK: - Concept picker shell

enum RevealConcept: String, CaseIterable, Identifiable {
    case title = "A · The Title"
    case monolith = "B · The Monolith"
    case dawn = "C · Dawn"
    var id: String { rawValue }
}

struct RevealConceptsView: View {
    @State private var concept: RevealConcept = .title
    @State private var runID = UUID() // changing identity replays a concept from beat zero
    let understanding = RevealUnderstanding()

    var body: some View {
        VStack(spacing: 12) {
            Picker("Concept", selection: $concept) {
                ForEach(RevealConcept.allCases) { Text($0.rawValue).tag($0) }
            }
            .pickerStyle(.segmented)
            .padding(.horizontal)

            Group {
                switch concept {
                case .title: TitleConceptView(u: understanding)
                case .monolith: MonolithConceptView(u: understanding)
                case .dawn: DawnConceptView(u: understanding)
                }
            }
            .id(runID)
            .clipShape(RoundedRectangle(cornerRadius: 28))
            .overlay(RoundedRectangle(cornerRadius: 28).strokeBorder(.white.opacity(0.08)))

            Button("Replay") { runID = UUID() }
                .buttonStyle(.bordered)
        }
        .padding(.vertical)
        .background(Color.black)
        .preferredColorScheme(.dark)
        .onChange(of: concept) { runID = UUID() }
    }
}

// MARK: - Beat clock (shared): drive named beats off one task

@MainActor
private final class BeatClock: ObservableObject {
    @Published var beat = 0
    func run(_ schedule: [Double], reduceMotion: Bool) async {
        guard !reduceMotion else { beat = schedule.count; return }
        for (i, delay) in schedule.enumerated() {
            try? await Task.sleep(for: .seconds(delay))
            guard !Task.isCancelled else { return }
            beat = i + 1
        }
    }
}

// MARK: - A · THE TITLE — film credits, light through the letterforms

struct TitleConceptView: View {
    let u: RevealUnderstanding
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @StateObject private var clock = BeatClock()
    // sweep: 0 = light band waiting off-right (letters charcoal), 1 = swept (lit)
    @State private var sweep1 = 0.0
    @State private var sweep2 = 0.0

    var body: some View {
        ZStack {
            Stage.bg
            VStack(spacing: 0) {
                Spacer()
                Text("A SEAFOOD FEAST AND A GATHERING")
                    .font(.system(size: 11, weight: .semibold))
                    .kerning(clock.beat >= 1 ? 2.6 : 7)
                    .foregroundStyle(Stage.steelSoft)
                    .opacity(clock.beat >= 1 ? 0.8 : 0)
                    .animation(.easeOut(duration: 1.6), value: clock.beat)
                    .padding(.bottom, 30)
                sweptTitle(u.eventName.components(separatedBy: " ").dropLast().joined(separator: " "), sweep: sweep1)
                sweptTitle((u.eventName.components(separatedBy: " ").last ?? "") + ".", sweep: sweep2)
                creditRoles
                    .opacity(clock.beat >= 3 ? 1 : 0)
                    .offset(y: clock.beat >= 3 ? 0 : 10)
                    .animation(.easeOut(duration: 0.9), value: clock.beat)
                    .padding(.top, 48)
                Spacer()
                cta
            }
            .padding(.horizontal, 30)
            letterboxBars
        }
        .task {
            await clock.run([0.4, 0.9, 3.2, 1.4], reduceMotion: reduceMotion)
        }
        .onChange(of: clock.beat) { _, b in
            // Beat 2 IS the light pass — one slow confident sweep per line.
            if b >= 2 || reduceMotion {
                let curve = Animation.timingCurve(0.4, 0, 0.2, 1, duration: reduceMotion ? 0 : 2.2)
                withAnimation(curve) { sweep1 = 1 }
                withAnimation(curve.delay(reduceMotion ? 0 : 0.8)) { sweep2 = 1 }
            }
        }
    }

    private func sweptTitle(_ text: String, sweep: Double) -> some View {
        Text(text)
            .font(.display(76))
            .kerning(-1.5)
            .foregroundStyle(
                LinearGradient(
                    stops: [
                        .init(color: Stage.ink, location: 0),
                        .init(color: .white, location: 0.5),
                        .init(color: Stage.charcoalType, location: 0.56),
                        .init(color: Stage.charcoalType, location: 1),
                    ],
                    // the band travels through the word: startPoint slides right→left
                    startPoint: UnitPoint(x: -1.4 + sweep * 1.6, y: 0.5),
                    endPoint: UnitPoint(x: 0.6 + sweep * 1.6, y: 0.5)
                )
            )
            .lineLimit(1)
            .minimumScaleFactor(0.5)
    }

    private var creditRoles: some View {
        VStack(spacing: 13) {
            ForEach(Array(u.rows.enumerated()), id: \.offset) { _, row in
                HStack {
                    Text(row.label).foregroundStyle(Stage.dim)
                    Spacer()
                    Text(row.value.uppercased()).foregroundStyle(Stage.grey).fontWeight(.semibold)
                }
                .font(.system(size: 11.5, weight: .medium))
                .kerning(1.6)
            }
        }
        .frame(maxWidth: 300)
    }

    private var cta: some View {
        Button(action: { /* setStage(.plan) */ }) {
            VStack(spacing: 8) {
                Text("OPEN YOUR PLAN")
                    .font(.system(size: 14, weight: .semibold))
                    .kerning(0.8)
                    .foregroundStyle(Stage.ink)
                Rectangle()
                    .fill(Stage.steelSoft)
                    .frame(width: clock.beat >= 4 ? 140 : 0, height: 1)
                    .animation(.timingCurve(0.22, 1, 0.36, 1, duration: 0.7), value: clock.beat)
            }
        }
        .buttonStyle(.plain)
        .opacity(clock.beat >= 4 ? 1 : 0)
        .animation(.easeOut(duration: 0.8), value: clock.beat)
        .padding(.bottom, 70)
    }

    private var letterboxBars: some View {
        VStack {
            Rectangle().fill(.black).frame(height: clock.beat >= 1 ? 44 : 0)
            Spacer()
            Rectangle().fill(.black).frame(height: clock.beat >= 1 ? 44 : 0)
        }
        .animation(.timingCurve(0.22, 1, 0.36, 1, duration: 1.1), value: clock.beat)
        .ignoresSafeArea()
    }
}

// MARK: - B · THE MONOLITH — keynote zoom, glint, rack focus

struct MonolithConceptView: View {
    let u: RevealUnderstanding
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @StateObject private var clock = BeatClock()

    var body: some View {
        ZStack {
            Color.black
            RadialGradient(colors: [Color(red: 0.07, green: 0.086, blue: 0.106), .clear],
                           center: .init(x: 0.5, y: 0.44), startRadius: 10, endRadius: 340)

            // The plan wall — waits out of focus behind the name.
            planWall
                .blur(radius: clock.beat >= 3 ? 0 : 14)
                .opacity(clock.beat >= 3 ? 1 : (clock.beat >= 2 ? 0.08 : 0))
                .animation(.timingCurve(0.22, 1, 0.36, 1, duration: 1.1), value: clock.beat)

            VStack(spacing: 20) {
                Text("YOUR EVENT, UNDERSTOOD")
                    .font(.system(size: 11.5, weight: .semibold))
                    .kerning(clock.beat >= 1 ? 3 : 8)
                    .foregroundStyle(Stage.dim)
                    .opacity(clock.beat >= 1 && clock.beat < 3 ? 0.7 : 0)
                    .animation(.easeOut(duration: 1.2), value: clock.beat)

                Text(u.eventName + ".")
                    .font(.display(54))
                    .kerning(-1.5)
                    .multilineTextAlignment(.center)
                    .foregroundStyle(Stage.ink)
                    // the keynote move: arrive from infinity with one precise curve
                    .scaleEffect(clock.beat >= 2 ? (clock.beat >= 3 ? 1.4 : 1.0) : 0.06)
                    .blur(radius: clock.beat >= 3 ? 9 : 0)
                    .opacity(clock.beat >= 3 ? 0 : (clock.beat >= 2 ? 1 : 0))
                    .animation(
                        clock.beat >= 3
                            ? .timingCurve(0.6, 0, 0.8, 0.4, duration: 1.1)
                            : .timingCurve(0.16, 1, 0.3, 1, duration: 2.2),
                        value: clock.beat)
                    .overlay(glint)
            }
            .padding(.horizontal, 24)

            cta
        }
        .task { await clock.run([0.8, 0.9, 3.6, 1.6], reduceMotion: reduceMotion) }
    }

    private var glint: some View {
        // one lens glint crossing the landed wordmark
        LinearGradient(colors: [.clear, .white.opacity(0.8), .clear],
                       startPoint: .leading, endPoint: .trailing)
            .frame(width: 44)
            .rotationEffect(.degrees(-16))
            .blendMode(.screen)
            .offset(x: clock.beat >= 2 ? 260 : -260)
            .opacity(clock.beat == 2 ? 1 : 0)
            .animation(.timingCurve(0.4, 0, 0.2, 1, duration: 1.0).delay(1.9), value: clock.beat)
            .allowsHitTesting(false)
    }

    private var planWall: some View {
        VStack(alignment: .leading, spacing: 24) {
            wallLine(bold: "5 moments,", rest: " hour by hour.")
            wallLine(bold: "23 guests,", rest: " counted in.")
            wallLine(bold: "10 dishes,", rest: " priced and sized.")
            wallLine(bold: "One decision", rest: " waiting: the venue.")
        }
        .padding(.horizontal, 34)
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func wallLine(bold: String, rest: String) -> some View {
        (Text(bold).fontWeight(.bold) + Text(rest).fontWeight(.light))
            .font(.system(size: 25))
            .foregroundStyle(Color(red: 0.906, green: 0.922, blue: 0.937))
    }

    private var cta: some View {
        VStack {
            Spacer()
            Button("Open your plan") { /* setStage(.plan) */ }
                .font(.system(size: 15.5, weight: .semibold))
                .buttonStyle(.borderedProminent)
                .buttonBorderShape(.capsule)
                .tint(Stage.ink)
                .foregroundStyle(.black)
                .scaleEffect(clock.beat >= 4 ? 1 : 0.94)
                .opacity(clock.beat >= 4 ? 1 : 0)
                .animation(.timingCurve(0.22, 1, 0.36, 1, duration: 0.7), value: clock.beat)
                .padding(.bottom, 66)
        }
    }
}

// MARK: - C · DAWN — silhouette until first light ignites the type

struct DawnConceptView: View {
    let u: RevealUnderstanding
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @StateObject private var clock = BeatClock()

    private var lit: Bool { clock.beat >= 2 }

    var body: some View {
        GeometryReader { geo in
            let horizonY = geo.size.height * 0.63
            ZStack {
                LinearGradient(colors: [Color(red: 0.016, green: 0.024, blue: 0.039),
                                        Color(red: 0.027, green: 0.039, blue: 0.059),
                                        Color(red: 0.012, green: 0.016, blue: 0.02)],
                               startPoint: .top, endPoint: .bottom)

                // the dawn dome — rises behind the horizon
                Ellipse()
                    .fill(RadialGradient(colors: [Stage.gold.opacity(0.85),
                                                  Stage.gold.opacity(0.28), .clear],
                                         center: .center, startRadius: 4, endRadius: 280))
                    .frame(width: 700, height: clock.beat >= 1 ? 420 : 8)
                    .position(x: geo.size.width / 2, y: horizonY)
                    .opacity(clock.beat >= 1 ? 1 : 0)
                    .blur(radius: 26)
                    .animation(.timingCurve(0.4, 0, 0.2, 1, duration: 2.6), value: clock.beat)

                // horizon hairline
                LinearGradient(colors: [.clear, Stage.gold.opacity(0.65), .clear],
                               startPoint: .leading, endPoint: .trailing)
                    .frame(height: 1)
                    .position(x: geo.size.width / 2, y: horizonY)
                    .opacity(clock.beat >= 1 ? 1 : 0)
                    .animation(.easeOut(duration: 2.0), value: clock.beat)

                // the name stands on the horizon — silhouette, then IGNITES
                Text(u.eventName + ".")
                    .font(.display(56))
                    .kerning(-1)
                    .multilineTextAlignment(.center)
                    .foregroundStyle(lit ? Color(red: 0.969, green: 0.941, blue: 0.886)
                                         : Color(red: 0.043, green: 0.051, blue: 0.063))
                    .shadow(color: Stage.gold.opacity(lit ? 0.45 : 0.18),
                            radius: lit ? 26 : 16, y: lit ? 2 : -12)
                    .animation(.easeInOut(duration: 2.2), value: lit)
                    .position(x: geo.size.width / 2, y: horizonY - 64)

                // the plan hangs in the sky
                VStack(spacing: 12) {
                    ForEach(Array(u.rows.enumerated()), id: \.offset) { i, row in
                        Text("\(row.label) — \(row.value.uppercased())")
                            .font(.system(size: 12, weight: .medium))
                            .kerning(2.2)
                            .foregroundStyle(Color(red: 0.725, green: 0.663, blue: 0.557))
                            .opacity(clock.beat >= 3 ? 1 : 0)
                            .animation(.easeOut(duration: 0.9).delay(Double(i) * 0.3), value: clock.beat)
                    }
                }
                .position(x: geo.size.width / 2, y: geo.size.height * 0.16)

                Text("The day starts here.")
                    .font(.guide(17))
                    .foregroundStyle(Color(red: 0.788, green: 0.706, blue: 0.565))
                    .opacity(lit ? 0.95 : 0)
                    .animation(.easeOut(duration: 1.2).delay(0.6), value: lit)
                    .position(x: geo.size.width / 2, y: horizonY + 44)

                VStack {
                    Spacer()
                    Button("Open your plan") { /* setStage(.plan) */ }
                        .font(.system(size: 14.5, weight: .semibold))
                        .foregroundStyle(Color(red: 0.941, green: 0.902, blue: 0.824))
                        .buttonStyle(.bordered)
                        .buttonBorderShape(.capsule)
                        .tint(Stage.gold)
                        .opacity(clock.beat >= 4 ? 1 : 0)
                        .animation(.easeOut(duration: 0.9), value: clock.beat)
                        .padding(.bottom, 60)
                }
            }
        }
        .background(Stage.bg)
        .task {
            await clock.run([0.8, 3.0, 2.6, 1.6], reduceMotion: reduceMotion)
            // Haptic at first light (never for solemn events — gate upstream):
            // #if canImport(UIKit)
            // UIImpactFeedbackGenerator(style: .soft).impactOccurred()
            // #endif
        }
    }
}

// MARK: - Previews

#Preview("All concepts") { RevealConceptsView() }
#Preview("A · The Title") { TitleConceptView(u: .init()).preferredColorScheme(.dark) }
#Preview("B · The Monolith") { MonolithConceptView(u: .init()).preferredColorScheme(.dark) }
#Preview("C · Dawn") { DawnConceptView(u: .init()).preferredColorScheme(.dark) }
