import { Link, useLocation } from "react-router-dom";
import {
  ExternalLink,
  GraduationCap,
  ListTree,
  Users,
} from "lucide-react";

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
  SidebarRail,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";
import { NavUser } from "./NavUser";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const location = useLocation();
  const pathname = location.pathname.replace("/", "");
  const { user, menu, permissions } = useAuth();
  const roleKey = (user?.SystemRole || user?.RoleId || "").toUpperCase();
  const isSystemAdmin =
    roleKey === "SYSTEM_OWNER" || roleKey === "SYSTEM_ADMIN" || roleKey === "ADMIN";
  const canAccessDanToc =
    isSystemAdmin ||
    menu?.some((item) => item.Controller?.toLowerCase() === "dantoc") ||
    permissions?.some((item) => item.Controller?.toLowerCase() === "dantoc" && item.IsViewed);

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
              <Link to="/user">
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
                isActive={pathname === "user" || pathname === ""}
                className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[active=true]:bg-sidebar-primary data-[active=true]:text-sidebar-primary-foreground data-[active=true]:font-semibold"
              >
                <Link className="font-medium" to="/user">
                  <Users className="size-4 text-blue-500" />
                  <span className="min-w-0 flex-1 whitespace-normal wrap-break-word">
                    Quản lý Người dùng
                  </span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            {canAccessDanToc && (
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname.toLowerCase() === "dantoc"}
                  className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[active=true]:bg-sidebar-primary data-[active=true]:text-sidebar-primary-foreground data-[active=true]:font-semibold"
                >
                  <Link className="font-medium" to="/dantoc">
                    <ListTree className="size-4 text-emerald-500" />
                    <span className="min-w-0 flex-1 whitespace-normal wrap-break-word">
                      Dân tộc
                    </span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}

            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              >
                <a
                  className="font-medium flex items-center gap-2"
                  href="http://localhost:3100"
                  target="_blank"
                  rel="noreferrer"
                >
                  <GraduationCap className="size-4 text-indigo-500" />
                  <span className="min-w-0 flex-1 whitespace-normal wrap-break-word">
                    Cổng E-Learning
                  </span>
                  <ExternalLink className="size-3 text-muted-foreground ml-auto" />
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
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
