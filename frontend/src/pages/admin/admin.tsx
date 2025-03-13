import { useEffect, useState } from "react";
import { Header } from "@/components/custom/header";
import {
  fetchAdminTokenUsage,
  getTokenLimit,
  setTokenLimit,
  AdminTokenUsageData,
  TokenLimitData,
} from "@/services/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  ChevronLeft,
  ChevronRight,
  BarChart3,
  Settings,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

// Define the user type for token usage data
interface TokenUsageUser {
  student_id: number;
  email: string;
  name: string;
  tokens_used: number;
}

export function Admin() {
  const [tokenUsageData, setTokenUsageData] =
    useState<AdminTokenUsageData | null>(null);
  const [tokenLimitData, setTokenLimitData] = useState<TokenLimitData | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"usage" | "settings">("usage");
  const [newGlobalLimit, setNewGlobalLimit] = useState<string>("");
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1);

  // Month names for display
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  useEffect(() => {
    loadData();
  }, [year, month]);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Load token usage data for the selected month
      const usageData = await fetchAdminTokenUsage(year, month);
      setTokenUsageData(usageData);

      // Load token limit data
      const limitData = await getTokenLimit();
      setTokenLimitData(limitData);

      if (limitData) {
        setNewGlobalLimit(limitData.global_limit.toString());
      }
    } catch (err) {
      console.error("Error loading admin data:", err);
      setError(
        "Failed to fetch data. Please make sure you have admin privileges."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTokenLimit = async () => {
    if (
      !newGlobalLimit ||
      isNaN(Number(newGlobalLimit)) ||
      Number(newGlobalLimit) <= 0
    ) {
      toast.error("Please enter a valid token limit (positive number)");
      return;
    }

    try {
      const result = await setTokenLimit(Number(newGlobalLimit));
      if (result && result.status === "success") {
        toast.success("Token limit updated successfully");
        setTokenLimitData(result);
      } else {
        toast.error("Failed to update token limit");
      }
    } catch (err) {
      console.error("Error updating token limit:", err);
      toast.error("Failed to update token limit");
    }
  };

  const handlePreviousMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  };

  const handleNextMonth = () => {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;

    // Don't allow navigating beyond current month
    if (year === currentYear && month === currentMonth) {
      return;
    }

    if (month === 12) {
      setMonth(1);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  };

  const isCurrentMonth = () => {
    const currentDate = new Date();
    return (
      year === currentDate.getFullYear() && month === currentDate.getMonth() + 1
    );
  };

  return (
    <div className="flex flex-col min-w-0 h-dvh bg-background">
      <Header />
      <div className="flex flex-col items-center flex-1 px-4 py-8">
        <div className="w-full max-w-4xl">
          <div className="mb-6 flex justify-between items-center">
            <h1 className="text-3xl font-bold">Admin Panel</h1>
            <div className="flex gap-2">
              <Button
                variant={activeTab === "usage" ? "default" : "outline"}
                onClick={() => setActiveTab("usage")}
                className="gap-2"
              >
                <BarChart3 size={16} />
                <span>Usage</span>
              </Button>
              <Button
                variant={activeTab === "settings" ? "default" : "outline"}
                onClick={() => setActiveTab("settings")}
                className="gap-2"
              >
                <Settings size={16} />
                <span>Settings</span>
              </Button>
            </div>
          </div>

          {loading && <div className="text-center py-8">Loading...</div>}
          {error && (
            <Card className="p-4 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 mb-4">
              <div className="flex gap-2 items-center text-red-600">
                <AlertTriangle size={20} />
                <p>{error}</p>
              </div>
            </Card>
          )}

          {!loading && !error && activeTab === "usage" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold mb-2">Token Usage</h2>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handlePreviousMonth}
                  >
                    <ChevronLeft size={16} />
                  </Button>

                  <span className="font-medium min-w-[180px] text-center">
                    {monthNames[month - 1]} {year}
                  </span>

                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleNextMonth}
                    disabled={isCurrentMonth()}
                  >
                    <ChevronRight size={16} />
                  </Button>
                </div>
              </div>

              <Card className="p-6">
                {tokenUsageData && (
                  <div>
                    <div className="flex justify-between mb-4">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Global Monthly Limit
                        </p>
                        <p className="text-2xl font-bold">
                          {tokenUsageData.global_limit.toLocaleString()} tokens
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Active Users
                        </p>
                        <p className="text-2xl font-bold">
                          {tokenUsageData.active_users}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Per User Limit
                        </p>
                        <p className="text-2xl font-bold">
                          {Math.floor(
                            tokenUsageData.global_limit /
                              tokenUsageData.active_users
                          ).toLocaleString()}{" "}
                          tokens
                        </p>
                      </div>
                    </div>

                    <div className="mt-6">
                      <h3 className="text-lg font-medium mb-3">
                        User Breakdown
                      </h3>

                      {tokenUsageData.usage_data.length === 0 ? (
                        <p className="text-muted-foreground text-center py-4">
                          No token usage data for this period
                        </p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-border">
                            <thead>
                              <tr>
                                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                                  User
                                </th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                                  Email
                                </th>
                                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                                  Tokens Used
                                </th>
                                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                                  % of Limit
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                              {tokenUsageData.usage_data.map(
                                (user: TokenUsageUser) => {
                                  const perUserLimit = Math.floor(
                                    tokenUsageData.global_limit /
                                      tokenUsageData.active_users
                                  );
                                  const percentUsed =
                                    perUserLimit > 0
                                      ? (user.tokens_used / perUserLimit) * 100
                                      : 0;

                                  return (
                                    <tr key={user.student_id}>
                                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                                        {user.name || "N/A"}
                                      </td>
                                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                                        {user.email}
                                      </td>
                                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                                        {(
                                          user.tokens_used || 0
                                        ).toLocaleString()}
                                      </td>
                                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                                        <span
                                          className={
                                            percentUsed > 95
                                              ? "text-red-500 font-medium"
                                              : ""
                                          }
                                        >
                                          {percentUsed.toFixed(1)}%
                                        </span>
                                      </td>
                                    </tr>
                                  );
                                }
                              )}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            </div>
          )}

          {!loading && !error && activeTab === "settings" && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold mb-2">Token Settings</h2>

              <Card className="p-6">
                {tokenLimitData && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium mb-3">
                        Global Token Limit
                      </h3>
                      <p className="text-muted-foreground mb-4">
                        Set the total number of tokens that will be distributed
                        equally among all active users each month.
                      </p>

                      <div className="flex gap-3 max-w-md">
                        <Input
                          type="number"
                          value={newGlobalLimit}
                          onChange={(e) => setNewGlobalLimit(e.target.value)}
                          placeholder="Enter token limit"
                          min="1"
                        />
                        <Button onClick={handleUpdateTokenLimit}>Update</Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-6">
                      <div className="p-4 border rounded-lg">
                        <p className="text-sm text-muted-foreground">
                          Current Global Limit
                        </p>
                        <p className="text-2xl font-bold">
                          {tokenLimitData.global_limit.toLocaleString()}
                        </p>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <p className="text-sm text-muted-foreground">
                          Active Users
                        </p>
                        <p className="text-2xl font-bold">
                          {tokenLimitData.active_users}
                        </p>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <p className="text-sm text-muted-foreground">
                          Per User Limit
                        </p>
                        <p className="text-2xl font-bold">
                          {tokenLimitData.per_user_limit.toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                      <h4 className="text-sm font-medium mb-1">Note</h4>
                      <p className="text-sm text-muted-foreground">
                        Token limits are distributed equally among all active
                        users. Changes take effect immediately, but won't affect
                        conversations already in progress.
                      </p>
                    </div>
                  </div>
                )}
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
