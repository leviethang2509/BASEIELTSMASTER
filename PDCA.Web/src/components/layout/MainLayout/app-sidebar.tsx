import * as React from "react";
import { ChevronRight, LayoutDashboard } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

import { BrandMark } from "@/components/brand/BrandMark";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { NavUser } from "./NavUser";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const location = useLocation();
  const pathname = location.pathname.replace("/", "");
  const { systemGroup, menu, user } = useAuth();
  const [openGroupId, setOpenGroupId] = React.useState<string | null>(null);

  const rootGroups = React.useMemo(
    () =>
      systemGroup
        ?.filter((group) => !group.ParentId)
        ?.sort((a, b) => a.Sort - b.Sort) || [],
    [systemGroup],
  );

  const isPathActive = (path?: string) => {
    if (!path) return false;
    return pathname.toLowerCase() === path.toLowerCase();
  };

  return (
    <Sidebar {...props} className="border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              asChild
              className="h-14 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <Link to="/">
                <BrandMark />
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname === ""}
                className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[active=true]:bg-sidebar-primary data-[active=true]:text-sidebar-primary-foreground data-[active=true]:font-semibold"
              >
                <Link className="font-medium" to="/">
                  <LayoutDashboard className="size-4" />
                  <span className="min-w-0 flex-1 whitespace-normal wrap-break-word">
                    Tổng quan vận hành
                  </span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            {rootGroups.map((group) => {
              const groupMenus = menu?.filter(
                (item) => item.SystemGroupId === group.Id,
              );
              const childGroups = systemGroup
                ?.filter((item) => item.ParentId === group.Id)
                ?.sort((a, b) => a.Sort - b.Sort);

              const hasChildren =
                Boolean(groupMenus?.length) || Boolean(childGroups?.length);
              if (!hasChildren) return null;

              const isGroupActive =
                groupMenus?.some((item) => isPathActive(item.Controller)) ||
                childGroups?.some((subGroup) =>
                  menu?.some(
                    (item) =>
                      item.SystemGroupId === subGroup.Id &&
                      isPathActive(item.Controller),
                  ),
                );

              return (
                <Collapsible
                  key={group.Id}
                  open={group.Id === openGroupId}
                  onOpenChange={(isOpen) =>
                    setOpenGroupId(isOpen ? group.Id : null)
                  }
                  className="group/collapsible"
                >
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton
                        className="font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground data-[active=true]:font-semibold"
                        isActive={isGroupActive}
                      >
                        <span className="min-w-0 flex-1 whitespace-normal wrap-break-word leading-snug">
                          {group.Name}
                        </span>
                        <ChevronRight className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <SidebarMenuSub className="mr-0 pr-0">
                        {groupMenus?.map((item) => (
                          <SidebarMenuSubItem key={item.Id}>
                            <SidebarMenuSubButton
                              asChild
                              isActive={isPathActive(item.Controller)}
                              className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                            >
                              <Link
                                to={item.Controller}
                                className={cn(
                                  "block w-full rounded-md p-2",
                                  isPathActive(item.Controller) &&
                                    "bg-sidebar-primary text-sidebar-primary-foreground font-semibold",
                                )}
                              >
                                <span className="min-w-0 flex-1 whitespace-normal wrap-break-word">
                                  {item.Name}
                                </span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}

                        {childGroups?.map((subGroup) => {
                          const subGroupMenus = menu?.filter(
                            (item) => item.SystemGroupId === subGroup.Id,
                          );

                          if (!subGroupMenus?.length) return null;

                          const isSubGroupActive = subGroupMenus.some((item) =>
                            isPathActive(item.Controller),
                          );

                          return (
                            <Collapsible
                              key={subGroup.Id}
                              className="group/sub-collapsible"
                            >
                              <SidebarMenuItem>
                                <CollapsibleTrigger asChild>
                                  <SidebarMenuButton
                                    className="h-auto whitespace-normal pr-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground data-[active=true]:font-semibold"
                                    isActive={isSubGroupActive}
                                  >
                                    <span className="min-w-0 flex-1 whitespace-normal wrap-break-word leading-snug">
                                      {subGroup.Name}
                                    </span>
                                    <ChevronRight className="ml-auto transition-transform group-data-[state=open]/sub-collapsible:rotate-90" />
                                  </SidebarMenuButton>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                  <SidebarMenuSub className="mr-0 border-l-0 px-0 ml-6">
                                    {subGroupMenus.map((item) => (
                                      <SidebarMenuSubItem key={item.Id}>
                                        <SidebarMenuSubButton
                                          asChild
                                          isActive={isPathActive(
                                            item.Controller,
                                          )}
                                          className="pl-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                                        >
                                          <Link
                                            to={item.Controller}
                                            className={cn(
                                              "block w-full rounded-md p-2",
                                              isPathActive(item.Controller) &&
                                                "bg-sidebar-primary text-sidebar-primary-foreground font-semibold",
                                            )}
                                          >
                                            <span className="min-w-0 flex-1 whitespace-normal wrap-break-word">
                                              {item.Name}
                                            </span>
                                          </Link>
                                        </SidebarMenuSubButton>
                                      </SidebarMenuSubItem>
                                    ))}
                                  </SidebarMenuSub>
                                </CollapsibleContent>
                              </SidebarMenuItem>
                            </Collapsible>
                          );
                        })}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        {user && <NavUser user={user} />}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
