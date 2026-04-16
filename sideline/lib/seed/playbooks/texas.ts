import type { TeamPlaybookSeed } from "../types";

export const TEXAS_SEED: TeamPlaybookSeed = {
  team: "Texas",
  scheme: "Spread",
  source: {
    url: "https://cfb.fan/26/playbooks/texas-off/",
    verified: "2026-04-16",
  },
  formations: [
    {
      formation: "Gun Normal Y Off Close",
      formationType: "Gun",
      plays: [
        { playName: "EMPTY MTN HB SWING", isNewIn26: true, playType: "Screen" },
        { playName: "EMPTY MTN JAILBREAK SCREEN", isNewIn26: true, playType: "Screen" },
        { playName: "EMPTY MTN SPOT REPLACE", isNewIn26: true, playType: "Quick Pass" },
        { playName: "MTN FAKE SCREEN WHEEL", isNewIn26: true, playType: "Screen" },
        { playName: "RELOAD GL HB TRAIL", isNewIn26: true },
        { playName: "RELOAD HB SWEEP", isNewIn26: true, playType: "Outside Run" },
        { playName: "RELOAD MESH SPOT", isNewIn26: true, playType: "Medium Pass" },
        { playName: "RELOAD PA CROSS", isNewIn26: true, playType: "Play Action" },
        { playName: "RELOAD PA DEEP SAIL", isNewIn26: true, playType: "Play Action" },
        { playName: "RELOAD RPO ZONE SNAG", isNewIn26: true, playType: "RPO" },
      ],
    },
    {
      formation: "Gun Normal Y Off Wk",
      formationType: "Gun",
      plays: [
        { playName: "ALL GO", isNewIn26: false, playType: "Deep Pass" },
        { playName: "CURL COMBO", isNewIn26: false, playType: "Medium Pass" },
        { playName: "HB DRAW", isNewIn26: false },
        { playName: "INSIDE CROSS", isNewIn26: false, playType: "Medium Pass" },
        { playName: "INSIDE ZONE", isNewIn26: false, playType: "Inside Run" },
        { playName: "PA Y CROSS", isNewIn26: false, playType: "Play Action" },
        { playName: "RPO ALERT BUBBLE", isNewIn26: false, playType: "RPO" },
        { playName: "RPO PEEK POST", isNewIn26: false, playType: "RPO" },
        { playName: "RPO READ Y FLAT", isNewIn26: false, playType: "RPO" },
        { playName: "RPO SPLIT ALERT BUBBLE", isNewIn26: false, playType: "RPO" },
        { playName: "SHALLOW CROSS", isNewIn26: false, playType: "Medium Pass" },
        { playName: "SLOT HOOKS", isNewIn26: false },
        { playName: "WR UNDER", isNewIn26: false },
        { playName: "X DAGGER", isNewIn26: false },
        { playName: "Z REPLACE", isNewIn26: false },
      ],
    },
    {
      formation: "Gun Stack Y Off Wk",
      formationType: "Gun",
      plays: [
        { playName: "PA Y CROSS", isNewIn26: true, playType: "Play Action" },
        { playName: "RETURN BENCH CROSS", isNewIn26: true, playType: "Medium Pass" },
        { playName: "RETURN JAILBREAK SCREEN", isNewIn26: true, playType: "Screen" },
        { playName: "RETURN RPO ALERT SNAG", isNewIn26: true, playType: "RPO" },
        { playName: "RPO POWER ALERT SCREEN", isNewIn26: false, playType: "RPO" },
        { playName: "RPO SPLIT ALERT BUBBLE", isNewIn26: true, playType: "RPO" },
        { playName: "RPO SPLIT ALERT SCREEN", isNewIn26: false, playType: "RPO" },
        { playName: "RPO TRAP ALERT SCREEN", isNewIn26: false, playType: "RPO" },
        { playName: "RZ PA BUBBLE SLANT", isNewIn26: true, playType: "Quick Pass" },
      ],
    },
    {
      formation: "Gun U Off Trips Wk",
      formationType: "Gun",
      plays: [
        { playName: "EXIT PA FK SCREEN", isNewIn26: false, playType: "Screen" },
        { playName: "OUTSIDE ZONE", isNewIn26: true, playType: "Outside Run" },
        { playName: "PA BOOT", isNewIn26: true, playType: "Play Action" },
      ],
    },
    {
      formation: "Gun Wing Flex Offset Wk",
      formationType: "Gun",
      plays: [
        { playName: "MTN PA FK SCREEN SCISSORS", isNewIn26: true, playType: "Screen" },
        { playName: "MTN RPO ALERT BUBBLE", isNewIn26: true, playType: "RPO" },
        { playName: "MTN RPO BUCK PEEK SLANT", isNewIn26: true, playType: "RPO" },
      ],
    },
    {
      formation: "Gun Y Off Trio Wk",
      formationType: "Gun",
      plays: [
        { playName: "MTN PA DEEP OVER", isNewIn26: false, playType: "Deep Pass" },
        { playName: "PA POST DIG SHOT", isNewIn26: false, playType: "Play Action" },
        { playName: "RPO ALERT ORBIT POST", isNewIn26: false, playType: "RPO" },
        { playName: "RPO ALERT ORBIT SWING", isNewIn26: false, playType: "RPO" },
        { playName: "RPO READ Y FLAT", isNewIn26: false, playType: "RPO" },
        { playName: "Y LEAD READ OPTION", isNewIn26: false, playType: "Option" },
      ],
    },
  ],
};
