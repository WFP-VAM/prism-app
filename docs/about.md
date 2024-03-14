# About PRISM

---

## What is PRISM?

PRISM is a technology solution which simplifies the integration of geospatial data on hazards such as droughts, floods, tropical storms, and earthquakes, along with information on socioeconomic vulnerability. PRISM combines data from these various sources to rapidly present decision makers with actionable information on vulnerable populations exposed to hazards, allowing them to prioritize assistance to those most in need.

PRISM is designed to improve utilization of the wealth of data available but not fully accessible to decision makers particularly in low-resource environments. This is especially true of Earth Observation data which typically requires specialized skills and technology infrastructure to make it useful for practitioners. PRISM is open-source software which has been developed by WFP since 2016 but with a major technology overhaul in 2020. Though the project is led by WFP, as open-source software it is open for collaboration and use by anyone.

![image](https://user-images.githubusercontent.com/3343536/141384994-383b4553-d434-418e-b45e-8385cab06ca1.png)

## Objectives

The objectives of PRISM are to provide greater access to data on hazards, particularly those generated from Earth observation data; to bring together various components of risk and impact analysis in a single system; to complement data from remote sensing with field data; and to provide tools to governments and local partners that foster local ownership and utilization of data for decision-making particularly related to disaster risk reduction and climate-resilience.

![image](https://user-images.githubusercontent.com/3343536/141389399-78b9aafe-cad1-4e0a-bcc8-22ab0af4db72.png)

## Data sources

The data used in current deployments of PRISM are provided by government entities, as well as by WFP. These include data on various climatic indicators including precipitation and vegetation conditions, socioeconomic vulnerability data such as poverty and food security, and ground station data on various weather parameters provided by the Met Services. However, PRISM is designed as a ‘bring your own data’ application which can accommodate a wide array of information.

PRISM supports three primary types of geospatial data: raster / pixel-based datasets typical of satellite-derived products such as levels of precipitation and current vegetation conditions; vector data which is used to describe a geographic area such as a province or district with a single value such as level of poverty; and point data which represents a measurement at a given location specified with latitude and longitude coordinates.

As PRISM requires external data as part of the deployment process, it is closely related to the forthcoming deployment of WFP’s global instance of the <a href="https://www.opendatacube.org/">Open Data Cube</a> platform. WFP’s Open Data Cube deployment provides climate monitoring data across more than 80 countries globally and is easily integrated into PRISM deployments. PRISM has also been configured to integrate data from other Open Data Cube deployments – providing a quick tool to display time-series raster data in an interactive dashboard. PRISM also integrates data from WFP’s related system – <a href="https://www.opendatacube.org/">ADAM</a> (Automatic Disaster Analysis & Mapping) which provides near real-time data on earthquakes, tropical storms, and soon floods.

Recently, the project has completed integration of data collected on mobile devices using <a href="https://www.kobotoolbox.org/">KoBo Toolbox</a> – a free and open-source field data collection tool developed by the Harvard Humanitarian Initiative with wide adoption across the humanitarian and development sectors. This integration allows data collected in the field to be visualized alongside PRISM’s other data sources in real-time.

## Ownership, disclaimers, and terms of use

PRISM is developed by the World Food Programme’s Research Assessments and Monitoring (RAM) Division, also known as Vulnerability Analysis and Mapping (VAM). WFP RAM deploys PRISM to partners in government while maintaining ownership of the project. WFP RAM manages the overall strategic planning and core development of the project while making its code available as open-source software for other entities to use for their purposes. PRISM is available for re-use under an <a href="https://github.com/WFP-VAM/prism-app/blob/master/LICENSE">MIT license</a>. As defined under the MIT license, the software is provided "as is", without warranty of any kind, express or implied. WFP is not liable for any loss or damage arising from, or directly or indirectly connected to, the use or operation of PRISM, including, but not limited to, any liability arising from any intentional or negligent misuse, errors, disclosure, undue transfer, loss or destruction of data that may occur.

The designations employed and the presentation of material in maps generated through PRISM do not imply the expression of any opinion whatsoever on the part of WFP concerning the legal or constitutional status of any country, territory, or sea area, or concerning the delimitation of frontiers. WFP does not represent or endorse the accuracy or reliability of any data, information or other material provided by any user through PRISM.

As a user of PRISM, you acknowledge and agree that you are responsible for ensuring the integrity and security of the information that you provide when accessing or using PRISM, including any Personal Data, irrespective of whether this Personal Data belongs to you or to a Third Party.

When working with PRISM’s source code and/or in its deployment, users may not publicly represent or imply that WFP is participating in, or has sponsored, approved, or endorsed the manner or purpose of your use or reproduction of PRISM. The official emblem or logo of WFP, shall not, under any circumstances, be used without WFP’s prior written consent, nor represent or imply an association or affiliation with WFP.

For more information, please contact <a href="mailto:wfp.vaminfo@wfp.org">wfp.vaminfo@wfp.org</a>.

Copyright &copy; 2021 World Food Programme
