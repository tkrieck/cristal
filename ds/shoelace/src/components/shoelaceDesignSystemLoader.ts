/**
 * See the LICENSE file distributed with this work for additional
 * information regarding copyright ownership.
 *
 * This is free software; you can redistribute it and/or modify it
 * under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation; either version 2.1 of
 * the License, or (at your option) any later version.
 *
 * This software is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public
 * License along with this software; if not, write to the Free
 * Software Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA
 * 02110-1301 USA, or see the FSF site: http://www.fsf.org.
 *
 * This file is part of the Cristal Wiki software prototype
 * @copyright  Copyright (c) 2023 XWiki SAS
 * @license    http://opensource.org/licenses/AGPL-3.0 AGPL-3.0
 *
 **/

import type { App } from "vue";
import type { DesignSystemLoader } from "@cristal/api";

import { injectable } from "inversify";

import XBtn from "../vue/x-btn.vue";
import XAlert from "../vue/x-alert.vue";
import XContainer from "../vue/x-container.vue";
import XCol from "../vue/x-col.vue";
import XRow from "../vue/x-row.vue";
import XImg from "../vue/x-img.vue";
import XCard from "../vue/x-card.vue";
import XTextField from "../vue/x-textfield.vue";
import XAvatar from "../vue/x-avatar.vue";
import XDivider from "../vue/x-divider.vue";
import XDialog from "../vue/x-dialog.vue";
import XMenu from "../vue/x-menu.vue";
import XMenuItem from "../vue/x-menuitem.vue";

import "@shoelace-style/shoelace/dist/themes/light.css";
import XBreadcrumb from "../vue/x-breadcrumb.vue";
import XAppBar from "../vue/x-app-bar.vue";
import XMain from "../vue/x-main.vue";
import XNavigationDrawer from "../vue/x-navigation-drawer.vue";
import XSearch from "../vue/x-search.vue";
import XLayout from "../vue/x-layout.vue";

@injectable()
export class ShoelaceDesignSystemLoader implements DesignSystemLoader {
  loadDesignSystem(app: App): void {
    app.component("XAvatar", XAvatar);
    app.component("XBtn", XBtn);
    app.component("XContainer", XContainer);
    app.component("XImg", XImg);
    app.component("XRow", XRow);
    app.component("XCol", XCol);
    app.component("XTextField", XTextField);
    app.component("XCard", XCard);
    app.component("XAlert", XAlert);
    app.component("XDivider", XDivider);
    app.component("XDialog", XDialog);
    app.component("XMenu", XMenu);
    app.component("XMenuItem", XMenuItem);
    app.component("XBreadcrumb", XBreadcrumb);
    app.component("XAppBar", XAppBar);
    app.component("XMain", XMain);
    app.component("XNavigationDrawer", XNavigationDrawer);
    app.component("XSearch", XSearch);
    app.component("XLayout", XLayout);
  }
}
