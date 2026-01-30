package com.hfims.xcan.gateway.tcp.demo.support;

import com.hfims.xcan.gateway.netty.error.CgiErrorEnum;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.io.Serializable;

/**
 * 基本结果对象
 */
@Data
public class BaseResult implements Serializable {
    private String code;
    private String msg;
    private Long ts;

    // Add explicit success field for JSON serialization
    @JsonProperty("success")
    private Boolean success;

    public BaseResult() {
    }

    public BaseResult(CgiErrorEnum errorCode) {
        this(errorCode.getCode(), errorCode.getMsg());
    }

    public BaseResult(String code, String msg) {
        this.code = code;
        this.msg = msg;
        this.ts = System.currentTimeMillis();
        this.success = CgiErrorEnum.CODE_000.getCode().equals(code);
    }

    public Boolean isSuccess() {
        return CgiErrorEnum.CODE_000.getCode().equals(code);
    }
}
