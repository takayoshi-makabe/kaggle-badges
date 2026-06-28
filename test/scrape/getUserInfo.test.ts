import { getKaggleuserProfile } from "../../src/scrape/getUserInfo";

describe("getKaggleuserProfile userName: spidermandance", () => {
  it("should return a valid user profile for spidermandance", async () => {
    const userName = "spidermandance";
    const userProfile = await getKaggleuserProfile(userName);
    const CompetitionsRank = userProfile.Competitions?.rank;
    const NotebooksRank = userProfile.Notebooks?.rank;
    const CompetitionsMedalCounts = userProfile.Competitions?.medal_counts;
    expect(CompetitionsRank).toEqual("Master");
    expect(NotebooksRank).toEqual("Expert");
    expect(userProfile.Datasets).toBeUndefined();
    expect(CompetitionsMedalCounts).toEqual({ gold: 2, silver: 2, bronze: 8 });
  }, 60000);
});

describe("getKaggleuserProfile userName: bestfitting", () => {
  it("should return a valid user profile for bestfitting", async () => {
    const userName = "bestfitting";
    const userProfile = await getKaggleuserProfile(userName);
    const CompetitionsRank = userProfile.Competitions?.rank;
    expect(CompetitionsRank).toEqual("Grandmaster");
  }, 60000);
});
