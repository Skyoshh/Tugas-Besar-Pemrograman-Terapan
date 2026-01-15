
import React from 'react';

export const UKFlag: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 30" className={className}>
        <clipPath id="uk-a"><path d="M0,0 v30 h60 v-30 z"/></clipPath>
        <clipPath id="uk-b"><path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z"/></clipPath>
        <g clipPath="url(#uk-a)">
            <path d="M0,0 v30 h60 v-30 z" fill="#00247d"/>
            <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6"/>
            <path d="M0,0 L60,30 M60,0 L0,30" clipPath="url(#uk-b)" stroke="#cf142b" strokeWidth="4"/>
            <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10"/>
            <path d="M30,0 v30 M0,15 h60" stroke="#cf142b" strokeWidth="6"/>
        </g>
    </svg>
);

export const ChinaFlag: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 600" className={className}>
        <rect width="900" height="600" fill="#de2910"/>
        <g fill="#ffde00">
            <path transform="translate(150 150) scale(90)" d="M0-1 .588.809-.951-.309H.951L-.588.809z"/>
            <path transform="translate(300 90) scale(30) rotate(23.4)" d="M0-1 .588.809-.951-.309H.951L-.588.809z"/>
            <path transform="translate(360 150) scale(30) rotate(45)" d="M0-1 .588.809-.951-.309H.951L-.588.809z"/>
            <path transform="translate(360 210) scale(30) rotate(66.6)" d="M0-1 .588.809-.951-.309H.951L-.588.809z"/>
            <path transform="translate(300 270) scale(30) rotate(88.2)" d="M0-1 .588.809-.951-.309H.951L-.588.809z"/>
        </g>
    </svg>
);
