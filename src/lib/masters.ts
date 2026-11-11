export interface MasterGame {
  id: string
  white: string
  black: string
  title: string
  event: string
  year: number
  result: "1-0" | "0-1" | "1/2-1/2"
  eco: string
  opening: string
  tags: string[]
  lesson: string
  pgn: string
}

function pgnOf(
  event: string,
  site: string,
  date: string,
  white: string,
  black: string,
  result: string,
  eco: string,
  moves: string,
): string {
  return `[Event "${event}"] [Site "${site}"] [Date "${date}"] [White "${white}"] [Black "${black}"] [Result "${result}"] [ECO "${eco}"]\n\n${moves}`
}

export const MASTER_GAMES: MasterGame[] = [
  {
    id: "opera",
    white: "Paul Morphy",
    black: "Duke Karl / Count Isouard",
    title: "The Opera Game",
    event: "Paris Opera Box",
    year: 1858,
    result: "1-0",
    eco: "C41",
    opening: "Philidor Defense",
    tags: ["development", "attacks", "sacrifice"],
    lesson: "The blueprint of development: every move brings a new piece hunting, until mate arrives by tempo.",
    pgn: pgnOf(
      "Paris Opera House",
      "Paris FRA",
      "1858.??.??",
      "Paul Morphy",
      "Duke Karl / Count Isouard",
      "1-0",
      "C41",
      "1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7 8. Nc3 c6 9. Bg5 b5 10. Nxb5 cxb5 11. Bxb5+ Nbd7 12. O-O-O Rd8 13. Rxd7 Rxd7 14. Rd1 Qe6 15. Bxd7+ Nxd7 16. Qb8+ Nxb8 17. Rd8# 1-0",
    ),
  },
  {
    id: "immortal",
    white: "Adolf Anderssen",
    black: "Lionel Kieseritzky",
    title: "The Immortal Game",
    event: "Simpson's Divan",
    year: 1851,
    result: "1-0",
    eco: "C33",
    opening: "King's Gambit Accepted",
    tags: ["classic gambit", "queens-side raid", "romantic"],
    lesson: "The ancestor of every sacrifice: two bishops, three branches, rook, and queen all given up.",
    pgn: pgnOf(
      "London",
      "London ENG",
      "1851.??.??",
      "Adolf Anderssen",
      "Lionel Kieseritzky",
      "1-0",
      "C33",
      "1. e4 e5 2. f4 exf4 3. Bc4 Qh4+ 4. Kf1 b5 5. Bxb5 Nf6 6. Nf3 Qh6 7. d3 Nh5 8. Nh4 Qg5 9. Nf5 c6 10. g4 Nf6 11. Rg1 cxb5 12. h4 Qg6 13. h5 Qg5 14. Qf3 Ng8 15. Bxf4 Qf6 16. Nc3 Bc5 17. Nd5 Qxb2 18. Bd6 Bxg1 19. e5 Qxa1+ 20. Ke2 Na6 21. Nxg7+ Kd8 22. Qf6+ Nxf6 23. Be7# 1-0",
    ),
  },
  {
    id: "century",
    white: "Donald Byrne",
    black: "Robert James Fischer",
    title: "The Game of the Century",
    event: "Rosenwald Memorial",
    year: 1956,
    result: "0-1",
    eco: "D92",
    opening: "Grünfeld, Russian System",
    tags: ["queen sacrifice", "windmill", "kingside raid"],
    lesson: "A 13-year-old gives up the queen and every piece dances: watch how minor pieces conduct a checkmate.",
    pgn: pgnOf(
      "Rosenwald Memorial",
      "New York, NY USA",
      "1956.10.17",
      "Donald Byrne",
      "Robert James Fischer",
      "0-1",
      "D92",
      "1. Nf3 Nf6 2. c4 g6 3. Nc3 Bg7 4. d4 O-O 5. Bf4 d5 6. Qb3 dxc4 7. Qxc4 c6 8. e4 Nbd7 9. Rd1 Nb6 10. Qc5 Bg4 11. Bg5 Na4 12. Qa3 Nxc3 13. bxc3 Nxe4 14. Bxe7 Qb6 15. Bc4 Nxc3 16. Bc5 Rfe8+ 17. Kf1 Be6 18. Bxb6 Bxc4+ 19. Kg1 Ne2+ 20. Kf1 Nxd4+ 21. Kg1 Ne2+ 22. Kf1 Nc3+ 23. Kg1 axb6 24. Qb4 Ra4 25. Qxb6 Nxd1 26. h3 Rxa2 27. Kh2 Nxf2 28. Re1 Rxe1 29. Qd8+ Bf8 30. Nxe1 Bd5 31. Nf3 Ne4 32. Qb8 b5 33. h4 h5 34. Ne5 Kg7 35. Kg1 Bc5+ 36. Kf1 Ng3+ 37. Ke1 Bb4+ 38. Kd1 Bb3+ 39. Kc1 Ne2+ 40. Kb1 Nc3+ 41. Kc1 Rc2# 0-1",
    ),
  },
  {
    id: "fischer6",
    white: "Robert James Fischer",
    black: "Boris Spassky",
    title: "The Masterpiece (Game 6)",
    event: "World Championship 1972",
    year: 1972,
    result: "1-0",
    eco: "D59",
    opening: "QGD, Tartakower Variation",
    tags: ["positional refinement", "squeeze", "R&B mate"],
    lesson: "Positional chess at its purest: no sacrifices, an exactzugzwang, mate delivered with king on h8.",
    pgn: pgnOf(
      "World Championship Match",
      "Reykjavik ISL",
      "1972.07.23",
      "Robert James Fischer",
      "Boris Spassky",
      "1-0",
      "D59",
      "1. c4 e6 2. Nf3 d5 3. d4 Nf6 4. Nc3 Be7 5. Bg5 O-O 6. e3 h6 7. Bh4 b6 8. cxd5 Nxd5 9. Bxe7 Qxe7 10. Nxd5 exd5 11. Rc1 Be6 12. Qa4 c5 13. Qa3 Rc8 14. Bb5 a6 15. dxc5 bxc5 16. O-O Ra7 17. Be2 Nd7 18. Nd4 Qf8 19. Nxe6 fxe6 20. e4 d4 21. f4 Qe7 22. e5 Rb8 23. Bc4 Kh8 24. Qh3 Nf8 25. b3 a5 26. f5 exf5 27. Rxf5 Nh7 28. Rcf1 Qd8 29. Qg3 Re7 30. h4 Rbb7 31. e6 Rbc7 32. Qe5 Qe8 33. a4 Qd8 34. R1f2 Qe8 35. R2f3 Qd8 36. Bd3 Qe8 37. Qe4 Nf6 38. Rxf6 gxf6 39. Rxf6 Kg8 40. Bc4 Kh8 41. Qf4 1-0",
    ),
  },
  {
    id: "kasparov-immortal",
    white: "Garry Kasparov",
    black: "Veselin Topalov",
    title: "Kasparov's Immortal",
    event: "Hoogovens, Wijk aan Zee",
    year: 1999,
    result: "1-0",
    eco: "B07",
    opening: "Pirc Defense",
    tags: ["rook sac", "forced king hunt", "engine-age"],
    lesson: "The most famous attacking game of the computer era: a rook, a bishop, and every check is fore_ORD.",
    pgn: pgnOf(
      "Hoogovens Group A",
      "Wijk aan Zee NED",
      "1999.01.20",
      "Garry Kasparov",
      "Veselin Topalov",
      "1-0",
      "B07",
      "1. e4 d6 2. d4 Nf6 3. Nc3 g6 4. Be3 Bg7 5. Qd2 c6 6. f3 b5 7. Nge2 Nbd7 8. Bh6 Bxh6 9. Qxh6 Bb7 10. a3 e5 11. O-O-O Qe7 12. Kb1 a6 13. Nc1 O-O-O 14. Nb3 exd4 15. Rxd4 c5 16. Rd1 Nb6 17. g3 Kb8 18. Na5 Ba8 19. Bh3 d5 20. Qf4+ Ka7 21. Rhe1 d4 22. Nd5 Nbxd5 23. exd5 Qd6 24. Rxd4 cxd4 25. Re7+ Kb6 26. Qxd4+ Kxa5 27. b4+ Ka4 28. Qc3 Qxd5 29. Ra7 Bb7 30. Rxb7 Qc4 31. Qxf6 Kxa3 32. Qxa6+ Kxb4 33. c3+ Kxc3 34. Qa1+ Kd2 35. Qb2+ Kd1 36. Bf1 Rd2 37. Rd7 Rxd7 38. Bxc4 bxc4 39. Qxh8 Rd3 40. Qa8 c3 41. Qa4+ Ke1 42. f4 f5 43. Kc1 Rd2 44. Qa7 1-0",
    ),
  },
]
