package com.hfims.xcan.gateway.tcp.demo.support;

import com.hfims.xcan.gateway.netty.error.CgiErrorEnum;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;

import java.io.Serializable;

/**
 * 基本结果对象
 */
@Getter
@Setter
@NoArgsConstructor
public class BaseResult implements Serializable {
    @JsonProperty("code")
    private String code;
    
    @JsonProperty("msg")
    private String msg;
    
    @JsonProperty("ts")
    private Long ts;
    
    @JsonProperty("success")
    private Boolean success;

    public BaseResult(CgiErrorEnum errorCode) {
        this(errorCode.getCode(), errorCode.getMsg());
    }

    public BaseResult(String code, String msg) {
        this.code = code;
        this.msg = msg;
        this.ts = System.currentTimeMillis();
        this.success = CgiErrorEnum.CODE_000.getCode().equals(code);
    }
}
